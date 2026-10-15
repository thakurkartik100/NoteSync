const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const NamingService = require('../common/NamingService');
const DSMiddleware = require('../common/DSMiddleware');
const DFSManager = require('../common/DFSManager');
const VectorClock = require('../common/VectorClock');
const ElectionEngine = require('../common/ElectionEngine');

const PORT = process.env.PORT || 5000;

const namingService = new NamingService();
const dsMiddleware = new DSMiddleware('GATEWAY');
const dfsManager = new DFSManager();
const gatewayVectorClock = new VectorClock('GATEWAY');

const NODES = {
  CE: { nodeId: 'node-ce', department: 'CE', url: process.env.NODE_CE_URL || 'http://localhost:5001', port: 5001, status: 'UNKNOWN', processId: 1 },
  IT: { nodeId: 'node-it', department: 'IT', url: process.env.NODE_IT_URL || 'http://localhost:5002', port: 5002, status: 'UNKNOWN', processId: 2 },
  'E&TC': { nodeId: 'node-etc', department: 'E&TC', url: process.env.NODE_ETC_URL || 'http://localhost:5003', port: 5003, status: 'UNKNOWN', processId: 3 }
};

const app = express();
app.use(cors());
app.use(express.json());

// In-memory Multer for proxying multipart uploads to target department nodes
const uploadProxy = multer({ storage: multer.memoryStorage() });

const uploadsRoot = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsRoot)) fs.mkdirSync(uploadsRoot, { recursive: true });
app.use('/uploads', express.static(uploadsRoot));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

function broadcastWS(data) {
  const payload = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// Cluster Leader State (observed from department nodes)
let currentClusterLeader = null;
let currentClusterLeaderPid = null;
let electionInProgress = false;

async function triggerClusterElection(initiator = null) {
  if (electionInProgress) {
    return { status: 'IN_PROGRESS', message: 'Election already active on cluster' };
  }
  electionInProgress = true;
  console.log(`[LeaderElection] Triggering cluster Bully election (initiator=${initiator || 'AUTO'})...`);

  // Choose starting node for election (prefer initiator, else first online node)
  const onlineDepts = Object.keys(NODES).filter(k => NODES[k].status === 'ONLINE');
  if (onlineDepts.length === 0) {
    electionInProgress = false;
    currentClusterLeader = null;
    currentClusterLeaderPid = null;
    return { status: 'NO_ONLINE_NODES', message: 'No department nodes currently ONLINE' };
  }

  const startingDept = (initiator && onlineDepts.includes(initiator)) ? initiator : onlineDepts[0];
  const startingNode = NODES[startingDept];

  try {
    const resp = await fetch(`${startingNode.url}/rpc/election/live`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: true })
    });
    const result = await resp.json();

    if (result && result.electedLeader) {
      currentClusterLeader = result.electedLeader;
      currentClusterLeaderPid = result.leaderProcessId;
      console.log(`[LeaderElection] ✓ New cluster leader elected: Node ${currentClusterLeader} (PID ${currentClusterLeaderPid})`);

      broadcastWS({
        type: 'LEADER_ELECTED',
        leader: currentClusterLeader,
        leaderProcessId: currentClusterLeaderPid,
        algorithm: 'BULLY-LIVE',
        timestamp: new Date().toISOString()
      });
    }

    return result;
  } catch (err) {
    console.error(`[LeaderElection] Error running election from ${startingDept}:`, err.message);
    return { status: 'FAILED', error: err.message };
  } finally {
    electionInProgress = false;
  }
}

// Heartbeat & Beacon Ping Monitor
async function checkNodeHealth(deptKey) {
  const node = NODES[deptKey];
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(`${node.url}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const prevStatus = NODES[deptKey].status;
      NODES[deptKey].status = 'ONLINE';
      NODES[deptKey].details = data;
      dsMiddleware.handleBeaconPing(deptKey, 'ONLINE', data.vectorClock);

      // Track node's reported leader
      if (data.leader) {
        currentClusterLeader = data.leader;
        currentClusterLeaderPid = data.leaderProcessId;
      }

      // Trigger automatic bounded repair when a node transitions from OFFLINE to ONLINE
      if (prevStatus === 'OFFLINE') {
        repairReplicasForNode(deptKey).catch(e => console.error(`[AutoRepair] Error repairing ${deptKey}:`, e.message));

        // If newly returned node has higher processId than current leader, trigger election
        const returnedPid = node.processId;
        if (!currentClusterLeaderPid || returnedPid > currentClusterLeaderPid) {
          console.log(`[LeaderElection] Node ${deptKey} returned with higher PID (${returnedPid} > ${currentClusterLeaderPid || 0}). Triggering election...`);
          setTimeout(() => triggerClusterElection(deptKey), 1000);
        }
      }
    } else {
      handleNodeFailure(deptKey);
    }
  } catch (err) {
    handleNodeFailure(deptKey, err.message);
  }
}

function handleNodeFailure(deptKey, errMsg = 'Connection Refused') {
  const prevStatus = NODES[deptKey].status;
  NODES[deptKey].status = 'OFFLINE';
  NODES[deptKey].details = { error: errMsg };
  dsMiddleware.handleBeaconPing(deptKey, 'OFFLINE', null);

  // If the failing node WAS the cluster leader, automatically trigger re-election!
  if (currentClusterLeader === deptKey && prevStatus === 'ONLINE') {
    console.warn(`[LeaderElection] ⚠️ Leader Node ${deptKey} went OFFLINE! Triggering re-election...`);
    currentClusterLeader = null;
    currentClusterLeaderPid = null;
    setTimeout(() => triggerClusterElection(), 500);
  }
}

// ── Phase 2B: Automatic Bounded Replica Repair ──
const activeRepairLocks = {};

async function repairReplicasForNode(deptKey) {
  if (activeRepairLocks[deptKey]) {
    return { status: 'LOCKED', message: `Repair already in progress for ${deptKey}` };
  }
  const targetNode = NODES[deptKey];
  if (!targetNode || targetNode.status !== 'ONLINE') {
    return { status: 'SKIPPED', message: `Target node ${deptKey} is not ONLINE` };
  }

  activeRepairLocks[deptKey] = true;
  console.log(`[ReplicaRepair] Starting bounded repair check for node ${deptKey}...`);

  const catalog = dfsManager.getDFSCatalog();
  const fileRecords = catalog.fileNamespace || {};
  let repairedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const details = [];

  try {
    for (const [fileId, record] of Object.entries(fileRecords)) {
      if (record.primaryNode === deptKey) continue; // This node is the primary, not replica

      const replicas = record.replicas || [];
      const repEntry = replicas.find(r => r.replicaNode === deptKey);

      let needsRepair = false;
      let reason = '';

      if (!repEntry || repEntry.status !== 'REPLICATED') {
        needsRepair = true;
        reason = repEntry ? `Status is ${repEntry.status}` : 'Missing replica entry in catalog';
      } else {
        // Physical file check on disk
        const cleanRepPath = repEntry.replicaFilePath.startsWith('/') ? repEntry.replicaFilePath.slice(1) : repEntry.replicaFilePath;
        const absRepPath = path.resolve(uploadsRoot, '..', cleanRepPath);
        if (!fs.existsSync(absRepPath)) {
          needsRepair = true;
          reason = 'Physical replica file missing from disk';
        } else {
          // Checksum verification
          try {
            const buf = fs.readFileSync(absRepPath);
            const sum = crypto.createHash('sha256').update(buf).digest('hex');
            if (record.primaryChecksum && sum !== record.primaryChecksum) {
              needsRepair = true;
              reason = `Checksum mismatch (got ${sum}, expected ${record.primaryChecksum})`;
            }
          } catch (readErr) {
            needsRepair = true;
            reason = `Read error on replica: ${readErr.message}`;
          }
        }
      }

      if (!needsRepair) {
        skippedCount++;
        continue;
      }

      console.log(`[ReplicaRepair] Repairing replica of ${fileId} on ${deptKey} (${reason})...`);

      // Locate a valid source (primary or another verified replica)
      let sourceBuffer = null;
      let sourceChecksum = record.primaryChecksum;

      // 1. Try primary file
      if (record.filename) {
        const primCandidate = path.resolve(uploadsRoot, record.primaryNode, record.filename);
        if (fs.existsSync(primCandidate)) {
          const buf = fs.readFileSync(primCandidate);
          const sum = crypto.createHash('sha256').update(buf).digest('hex');
          if (!sourceChecksum || sum === sourceChecksum) {
            sourceBuffer = buf;
            sourceChecksum = sum;
          }
        }
      }

      // Also search uploads/<primaryNode> for files starting with primary node prefix if needed
      if (!sourceBuffer) {
        const primFolder = path.resolve(uploadsRoot, record.primaryNode);
        if (fs.existsSync(primFolder)) {
          const files = fs.readdirSync(primFolder);
          for (const f of files) {
            const abs = path.join(primFolder, f);
            try {
              const buf = fs.readFileSync(abs);
              const sum = crypto.createHash('sha256').update(buf).digest('hex');
              if (sourceChecksum && sum === sourceChecksum) {
                sourceBuffer = buf;
                break;
              }
            } catch (e) {}
          }
        }
      }

      // 2. Fallback to any other verified secondary replica (prioritizing the elected Leader node)
      if (!sourceBuffer) {
        const sortedReplicas = [...replicas].sort((a, b) => {
          if (a.replicaNode === currentClusterLeader) return -1;
          if (b.replicaNode === currentClusterLeader) return 1;
          return 0;
        });

        for (const otherRep of sortedReplicas) {
          if (otherRep.replicaNode === deptKey || otherRep.status !== 'REPLICATED') continue;
          if (!otherRep.replicaFilePath) continue;
          const cleanOther = otherRep.replicaFilePath.startsWith('/') ? otherRep.replicaFilePath.slice(1) : otherRep.replicaFilePath;
          const absOther = path.resolve(uploadsRoot, '..', cleanOther);
          if (fs.existsSync(absOther)) {
            const buf = fs.readFileSync(absOther);
            const sum = crypto.createHash('sha256').update(buf).digest('hex');
            if (!sourceChecksum || sum === sourceChecksum) {
              sourceBuffer = buf;
              sourceChecksum = sum;
              break;
            }
          }
        }
      }

      if (!sourceBuffer) {
        console.warn(`[ReplicaRepair] Cannot repair ${fileId}: No valid source copy available`);
        failedCount++;
        details.push({ fileId, status: 'FAILED', reason: 'No valid source copy available on cluster' });
        continue;
      }

      // Transfer actual bytes to target node's /rpc/replica endpoint
      try {
        const form = new FormData();
        const fileBlob = new Blob([sourceBuffer], { type: 'application/octet-stream' });
        form.append('file', fileBlob, record.filename || 'repaired_file.bin');
        form.append('originalResourceId', fileId);
        form.append('primaryNode', record.primaryNode);
        form.append('primaryChecksum', sourceChecksum);
        form.append('lamportClock', record.lamportClock || 0);
        form.append('vectorClock', JSON.stringify(record.vectorClock || gatewayVectorClock.getVector()));

        const resp = await fetch(`${targetNode.url}/rpc/replica`, {
          method: 'POST',
          body: form
        });
        const data = await resp.json();

        if (resp.ok && data.status === 'SUCCESS' && data.verified) {
          // If a stale corrupted file existed at old replica path, clean it up
          if (repEntry && repEntry.replicaFilePath && repEntry.replicaFilePath !== data.replicaFilePath) {
            const oldPath = path.resolve(uploadsRoot, '..', repEntry.replicaFilePath.replace(/^\//, ''));
            if (fs.existsSync(oldPath)) {
              try { fs.unlinkSync(oldPath); } catch (e) {}
            }
          }

          dfsManager.updateReplicaRecord(fileId, {
            replicaNode: deptKey,
            replicaFilePath: data.replicaFilePath,
            replicaChecksum: data.replicaChecksum,
            verified: true,
            status: 'REPLICATED',
            timestamp: new Date().toISOString()
          });

          repairedCount++;
          details.push({ fileId, status: 'REPAIRED', replicaFilePath: data.replicaFilePath });
          console.log(`[ReplicaRepair] ✓ Repaired ${fileId} on ${deptKey}`);
        } else {
          failedCount++;
          details.push({ fileId, status: 'FAILED', reason: data.error || 'Target node rejected replica' });
          console.warn(`[ReplicaRepair] ✗ Failed to repair ${fileId}:`, data.error);
        }
      } catch (postErr) {
        failedCount++;
        details.push({ fileId, status: 'FAILED', reason: postErr.message });
        console.error(`[ReplicaRepair] ✗ Error sending repair to ${deptKey}:`, postErr.message);
      }
    }
  } finally {
    delete activeRepairLocks[deptKey];
  }

  return {
    status: 'COMPLETE',
    targetNode: deptKey,
    repairedCount,
    skippedCount,
    failedCount,
    details
  };
}

setInterval(() => {
  Promise.all(Object.keys(NODES).map(key => checkNodeHealth(key))).then(() => {
    broadcastWS({
      type: 'NODE_STATUS_UPDATE',
      nodes: NODES,
      gatewayVectorClock: gatewayVectorClock.getVector(),
      timestamp: new Date().toISOString()
    });
  });
}, 3000);

Promise.all(Object.keys(NODES).map(key => checkNodeHealth(key)));

wss.on('connection', ws => {
  ws.send(JSON.stringify({
    type: 'INITIAL_STATE',
    nodes: NODES,
    namingDirectory: namingService.getDirectory(),
    gatewayVectorClock: gatewayVectorClock.getVector()
  }));
});

// API Routes

// 1. Get Node Statuses & Directory (including elected department leader)
app.get('/api/nodes', (req, res) => {
  res.json({
    gatewayStatus: 'ONLINE',
    role: 'API_GATEWAY',
    electedLeader: currentClusterLeader,
    electedLeaderProcessId: currentClusterLeaderPid,
    nodes: NODES,
    namingDirectory: namingService.getDirectory(),
    gatewayVectorClock: gatewayVectorClock.getVector()
  });
});

// Trigger Distributed Bully Election across department nodes
app.post('/api/election/trigger', async (req, res) => {
  const { initiator } = req.body || {};
  const normalizedInitiator = initiator ? ((initiator.toUpperCase() === 'ETC' || initiator.toUpperCase() === 'E&TC') ? 'E&TC' : initiator.toUpperCase()) : null;
  try {
    const result = await triggerClusterElection(normalizedInitiator);
    res.json(result);
  } catch (err) {
    res.status(500).json({ status: 'ERROR', error: err.message });
  }
});

// Get Current Cluster Leader status from all nodes
app.get('/api/election/leader', async (req, res) => {
  const nodeReports = {};
  for (const [dept, n] of Object.entries(NODES)) {
    if (n.status === 'ONLINE') {
      try {
        const resp = await fetch(`${n.url}/election/leader`);
        if (resp.ok) nodeReports[dept] = await resp.json();
      } catch (e) {
        nodeReports[dept] = { error: e.message };
      }
    } else {
      nodeReports[dept] = { status: 'OFFLINE' };
    }
  }

  res.json({
    gatewayRole: 'API_GATEWAY',
    clusterLeader: currentClusterLeader,
    clusterLeaderProcessId: currentClusterLeaderPid,
    nodes: nodeReports
  });
});

// ── Distributed Mutual Exclusion: Gateway Proxy to Leader ──
// Helper to resolve currently elected leader node URL
function getLeaderNode() {
  if (currentClusterLeader && NODES[currentClusterLeader] && NODES[currentClusterLeader].status === 'ONLINE') {
    return NODES[currentClusterLeader];
  }
  // Fallback to highest available node
  const online = Object.values(NODES).filter(n => n.status === 'ONLINE');
  if (online.length === 0) return null;
  return online.reduce((max, n) => n.processId > max.processId ? n : max, online[0]);
}

app.post('/api/locks/acquire', async (req, res) => {
  const leaderNode = getLeaderNode();
  if (!leaderNode) {
    return res.status(503).json({ error: 'No active coordinator node available to manage locks' });
  }

  try {
    const resp = await fetch(`${leaderNode.url}/rpc/lock/acquire`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await resp.json();
    res.status(resp.status).json({ ...data, coordinator: leaderNode.department });
  } catch (err) {
    res.status(500).json({ error: `Lock acquisition error: ${err.message}` });
  }
});

app.post('/api/locks/release', async (req, res) => {
  const leaderNode = getLeaderNode();
  if (!leaderNode) {
    return res.status(503).json({ error: 'No active coordinator node available to manage locks' });
  }

  try {
    const resp = await fetch(`${leaderNode.url}/rpc/lock/release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await resp.json();
    res.status(resp.status).json({ ...data, coordinator: leaderNode.department });
  } catch (err) {
    res.status(500).json({ error: `Lock release error: ${err.message}` });
  }
});

app.get('/api/locks/status', async (req, res) => {
  const leaderNode = getLeaderNode();
  if (!leaderNode) {
    return res.json({ coordinator: null, activeLocks: [], count: 0 });
  }

  try {
    const resp = await fetch(`${leaderNode.url}/rpc/lock/status`);
    const data = await resp.json();
    res.json({ ...data, coordinator: leaderNode.department });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual / Administrative Replica Repair Endpoint
app.post('/api/nodes/:dept/repair', async (req, res) => {
  const deptKey = req.params.dept.toUpperCase();
  const normalizedKey = (deptKey === 'ETC' || deptKey === 'E&TC') ? 'E&TC' : deptKey;
  if (!NODES[normalizedKey]) {
    return res.status(404).json({ error: `Node ${deptKey} not found` });
  }
  try {
    const result = await repairReplicasForNode(normalizedKey);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Proxy Node Internal Audit Logs
app.get('/api/nodes/:dept/logs', async (req, res) => {
  const deptKey = req.params.dept.toUpperCase();
  const targetNode = NODES[deptKey];
  if (!targetNode || targetNode.status !== 'ONLINE') {
    return res.json({ nodeId: deptKey, logs: [] });
  }
  try {
    const resp = await fetch(`${targetNode.url}/logs`);
    if (resp.ok) {
      const text = await resp.text();
      const data = text ? JSON.parse(text) : { logs: [] };
      return res.json(data);
    }
    res.json({ nodeId: deptKey, logs: [] });
  } catch (err) {
    res.json({ nodeId: deptKey, logs: [] });
  }
});

// 2. Toggle Node Status
app.post('/api/nodes/:dept/toggle', async (req, res) => {
  const deptKey = req.params.dept.toUpperCase();
  const targetNode = NODES[deptKey];
  if (!targetNode) return res.status(404).json({ error: 'Department node not found' });

  const nextStatus = targetNode.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
  try {
    const response = await fetch(`${targetNode.url}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus })
    });
    const data = await response.json();
    NODES[deptKey].status = nextStatus;

    gatewayVectorClock.tick(`ToggleNode:${deptKey}:${nextStatus}`);

    broadcastWS({
      type: 'NODE_STATUS_TOGGLED',
      department: deptKey,
      newStatus: nextStatus,
      timestamp: new Date().toISOString()
    });

    // If node was toggled to ONLINE, trigger background repair
    if (nextStatus === 'ONLINE') {
      repairReplicasForNode(deptKey).catch(e => console.error(`[ToggleRepair] Error repairing ${deptKey}:`, e.message));
    }

    res.json({ message: `Toggled ${deptKey} node to ${nextStatus}`, data, nodes: NODES });
  } catch (err) {
    res.status(500).json({ error: `Failed to toggle node status: ${err.message}` });
  }
});

// 3. Aggregate Resources
app.get('/api/resources', async (req, res) => {
  const { department, subject, resourceType, search } = req.query;

  let targetDepts = Object.keys(NODES);
  if (department && department !== 'ALL') {
    const normalizedDept = department.toUpperCase();
    targetDepts = targetDepts.filter(d => d === normalizedDept || (d === 'E&TC' && (normalizedDept === 'ETC' || normalizedDept === 'E&TC')));
  }

  let allResources = [];
  let nodeStatusSummary = {};

  for (const deptKey of targetDepts) {
    const node = NODES[deptKey];
    if (node.status === 'ONLINE') {
      try {
        const queryParams = new URLSearchParams();
        if (subject) queryParams.append('subject', subject);
        if (resourceType) queryParams.append('resourceType', resourceType);
        if (search) queryParams.append('search', search);

        const resp = await fetch(`${node.url}/resources?${queryParams.toString()}`);
        if (resp.ok) {
          const data = await resp.json();
          allResources.push(...(data.resources || []));
          nodeStatusSummary[deptKey] = { status: 'ONLINE', count: data.count, vectorClock: data.vectorClock };
        } else {
          nodeStatusSummary[deptKey] = { status: 'OFFLINE', error: 'HTTP error' };
        }
      } catch (err) {
        nodeStatusSummary[deptKey] = { status: 'OFFLINE', error: err.message };
      }
    } else {
      nodeStatusSummary[deptKey] = { status: 'OFFLINE', note: 'Node marked offline' };
    }
  }

  allResources.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

  res.json({
    gateway: 'API-Gateway-Proxy',
    totalResources: allResources.length,
    nodeStatusSummary,
    gatewayVectorClock: gatewayVectorClock.getVector(),
    resources: allResources
  });
});

// 4. Upload Resource (Proxies multipart file and metadata to target node & registers in Mini-DFS)
app.post('/api/resources/upload', uploadProxy.single('file'), async (req, res) => {
  const dept = (req.headers['x-department'] || req.body?.department || 'CE').toUpperCase();
  const deptKey = (dept === 'ETC' || dept === 'E&TC') ? 'E&TC' : dept;

  if (!req.file) {
    return res.status(400).json({ error: 'Please attach an academic file to upload.' });
  }
  
  // Location Transparency Resolution
  const resolvedEndpoint = dsMiddleware.resolveLocation(deptKey);
  const targetNode = NODES[deptKey];

  if (!targetNode) return res.status(400).json({ error: `Invalid department: ${dept}` });
  
  // Re-verify node health on demand if not online
  if (targetNode.status !== 'ONLINE') {
    await checkNodeHealth(deptKey);
  }

  if (targetNode.status !== 'ONLINE') {
    return res.status(503).json({
      error: `Department Node [Node ${deptKey}] is currently OFFLINE. Please check Nodes Monitor to turn Node ${deptKey} ON.`
    });
  }

  gatewayVectorClock.tick(`UploadProxy:${deptKey}`);

  try {
    // Construct outgoing multipart FormData with the file buffer and form fields
    const outgoingFormData = new FormData();
    const fileBlob = new Blob([req.file.buffer], { type: req.file.mimetype || 'application/octet-stream' });
    outgoingFormData.append('file', fileBlob, req.file.originalname);
    outgoingFormData.append('title', req.body.title || req.file.originalname);
    outgoingFormData.append('description', req.body.description || '');
    outgoingFormData.append('subject', req.body.subject || '');
    outgoingFormData.append('department', deptKey);
    outgoingFormData.append('resourceType', req.body.resourceType || 'Notes');
    outgoingFormData.append('uploadedBy', req.body.uploadedBy || 'Anonymous Student');
    outgoingFormData.append('vector', JSON.stringify(gatewayVectorClock.getVector()));

    const resp = await fetch(`${targetNode.url}/resources`, {
      method: 'POST',
      body: outgoingFormData
    });
    const text = await resp.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      console.error(`[Upload Proxy Error] Department node ${deptKey} returned non-JSON response:`, text);
      return res.status(500).json({ error: text || 'Invalid response from department node' });
    }

    if (!resp.ok) {
      console.error(`[Upload Proxy Error] Department node ${deptKey} status ${resp.status}:`, data);
      return res.status(resp.status || 500).json({ error: data.error || data.message || `Department node ${deptKey} upload failed` });
    }

    // ── Phase 2A: Real Physical Replication ──
    const resource = data.resource || {};
    const primaryFilePath = resource.filePath; // e.g. "/uploads/CE/CE_xxx.txt"

    // Read the primary file from disk and compute its SHA-256
    let primaryChecksum = null;
    let primaryFileBuffer = null;
    if (primaryFilePath) {
      const cleanPath = primaryFilePath.startsWith('/') ? primaryFilePath.slice(1) : primaryFilePath;
      const absolutePrimary = path.resolve(uploadsRoot, '..', cleanPath);
      if (fs.existsSync(absolutePrimary)) {
        primaryFileBuffer = fs.readFileSync(absolutePrimary);
        primaryChecksum = crypto.createHash('sha256').update(primaryFileBuffer).digest('hex');
      } else {
        console.warn(`[Replication] Primary file not found at ${absolutePrimary}, skipping replication`);
      }
    }

    // Replicate to every OTHER department node
    const replicaResults = [];
    if (primaryFileBuffer && primaryChecksum) {
      const allDepts = Object.keys(NODES); // CE, IT, E&TC
      const secondaryDepts = allDepts.filter(d => d !== deptKey);

      for (const secDept of secondaryDepts) {
        const secNode = NODES[secDept];
        try {
          // Quick health check
          if (secNode.status !== 'ONLINE') {
            await checkNodeHealth(secDept);
          }
          if (secNode.status !== 'ONLINE') {
            replicaResults.push({ replicaNode: secDept, status: 'FAILED', error: `Node ${secDept} is OFFLINE` });
            console.warn(`[Replication] Node ${secDept} is OFFLINE — replica skipped`);
            continue;
          }

          const replicaForm = new FormData();
          const fileBlob = new Blob([primaryFileBuffer], { type: 'application/octet-stream' });
          replicaForm.append('file', fileBlob, resource.fileName || 'replica_file');
          replicaForm.append('originalResourceId', resource.id);
          replicaForm.append('primaryNode', deptKey);
          replicaForm.append('primaryChecksum', primaryChecksum);
          replicaForm.append('lamportClock', resource.lamportClock || data.clock || 0);
          replicaForm.append('vectorClock', JSON.stringify(resource.vectorClock || data.vectorClock || gatewayVectorClock.getVector()));

          const replicaResp = await fetch(`${secNode.url}/rpc/replica`, {
            method: 'POST',
            body: replicaForm
          });
          const replicaData = await replicaResp.json();
          replicaResults.push(replicaData);

          if (replicaData.status === 'SUCCESS') {
            console.log(`[Replication] ✓ Replicated ${resource.id} to ${secDept} (verified=${replicaData.verified})`);
          } else {
            console.warn(`[Replication] ✗ Replica to ${secDept} failed: ${replicaData.error}`);
          }
        } catch (repErr) {
          replicaResults.push({ replicaNode: secDept, status: 'FAILED', error: repErr.message });
          console.error(`[Replication] ✗ Error replicating to ${secDept}:`, repErr.message);
        }
      }
    }

    // Unit IV DFS Registration with real replica results
    const resourceWithChecksum = { ...(data.resource || req.body), primaryChecksum };
    const dfsRecord = dfsManager.registerDFSFile(resourceWithChecksum, replicaResults);

    broadcastWS({
      type: 'RESOURCE_UPLOADED',
      department: deptKey,
      resource: data.resource,
      dfsRecord,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({ ...data, dfsRecord });
  } catch (err) {
    res.status(500).json({ error: `Failed to proxy resource upload to ${deptKey}: ${err.message}` });
  }
});

// 5. Delete Resource (Proxies delete to target node)
app.delete('/api/resources/:dept/:id', async (req, res) => {
  let deptKey = req.params.dept.toUpperCase();
  if (deptKey === 'ETC') deptKey = 'E&TC';

  const targetNode = NODES[deptKey];
  if (!targetNode) return res.status(404).json({ error: `Invalid department: ${req.params.dept}` });

  if (targetNode.status !== 'ONLINE') {
    return res.status(503).json({ error: `Department Node [Node ${deptKey}] is currently OFFLINE.` });
  }

  // ── Distributed Mutual Exclusion: Acquire lock from elected Leader before deletion ──
  const resourceId = req.params.id;
  const leaderNode = getLeaderNode();
  let lockAcquired = false;

  if (leaderNode) {
    try {
      const lockResp = await fetch(`${leaderNode.url}/rpc/lock/acquire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceId, requesterNode: 'API_GATEWAY', leaseMs: 3000 })
      });
      if (lockResp.status === 423) {
        const lockErr = await lockResp.json();
        return res.status(423).json({
          error: `Resource deletion blocked: currently locked by Node ${lockErr.holder}`,
          lockDetails: lockErr
        });
      }
      lockAcquired = lockResp.ok;
    } catch (e) {
      console.warn(`[Mutex] Warning: Could not acquire lock from coordinator ${leaderNode.department}:`, e.message);
    }
  }

  try {
    const resp = await fetch(`${targetNode.url}/resources/${req.params.id}`, {
      method: 'DELETE'
    });
    const text = await resp.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      data = { message: text };
    }

    if (!resp.ok) {
      return res.status(resp.status || 500).json(data);
    }

    // Also remove from DFS catalog namespace
    dfsManager.removeDFSFile(req.params.id);

    gatewayVectorClock.tick(`DeleteProxy:${deptKey}:${req.params.id}`);

    broadcastWS({
      type: 'RESOURCE_DELETED',
      department: deptKey,
      resourceId: req.params.id,
      timestamp: new Date().toISOString()
    });

    res.json({ message: `Resource deleted from Node ${deptKey}`, ...data });
  } catch (err) {
    res.status(500).json({ error: `Failed to proxy delete to ${deptKey}: ${err.message}` });
  } finally {
    if (lockAcquired && leaderNode) {
      fetch(`${leaderNode.url}/rpc/lock/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceId, requesterNode: 'API_GATEWAY' })
      }).catch(e => console.warn('[Mutex] Error releasing lock:', e.message));
    }
  }
});

// 6. Download Endpoint (Download actual stored file with failover & path traversal protection)
app.get('/api/download', (req, res) => {
  const filePath = req.query.filePath || '';
  let fileName = req.query.fileName || req.query.title || 'NoteSync_Resource';

  if (!filePath) {
    return res.status(400).json({ error: 'File path parameter is required' });
  }

  // Prevent path traversal by resolving against uploadsRoot
  const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
  const absolutePath = path.resolve(__dirname, '..', '..', cleanPath);

  // Security check: ensure resolved path is strictly inside uploadsRoot
  const uploadsBoundary = uploadsRoot.endsWith(path.sep) ? uploadsRoot : uploadsRoot + path.sep;
  if (!absolutePath.startsWith(uploadsBoundary)) {
    return res.status(403).json({ error: 'Access denied: Invalid file path' });
  }

  // Determine primary department node from the file path (e.g. "uploads/CE/...")
  const pathParts = cleanPath.split(/[/\\]/);
  // uploads/<DEPT>/<filename>
  const targetDept = (pathParts[1] || '').toUpperCase();
  const primaryNodeKey = (targetDept === 'ETC' || targetDept === 'E&TC') ? 'E&TC' : targetDept;
  const primaryNode = NODES[primaryNodeKey];

  const primaryAvailable = primaryNode && primaryNode.status === 'ONLINE' && fs.existsSync(absolutePath);

  // If primary file exists and primary node is online, serve directly
  if (primaryAvailable) {
    fileName = path.basename(fileName).replace(/[/\\?%*:|"<>]/g, '_');
    const storedExt = path.extname(absolutePath);
    if (!fileName.toLowerCase().endsWith(storedExt.toLowerCase())) {
      fileName = fileName + storedExt;
    }
    return res.download(absolutePath, fileName);
  }

  console.warn(`[Download] Primary file unavailable or Node ${primaryNodeKey} offline. Attempting failover for: ${filePath}`);

  // ── Failover to verified DFS replica ──
  const catalog = dfsManager.getDFSCatalog();
  const fileRecords = catalog.fileNamespace || {};
  let matchedRecord = null;

  // Search by exact primary filename or by replicaFilePath
  for (const record of Object.values(fileRecords)) {
    if (record.filename && (filePath.endsWith(record.filename) || cleanPath.endsWith(record.filename))) {
      matchedRecord = record;
      break;
    }
    if (record.replicas) {
      for (const rep of record.replicas) {
        if (rep.replicaFilePath === filePath || rep.replicaFilePath === '/' + cleanPath) {
          matchedRecord = record;
          break;
        }
      }
    }
    if (matchedRecord) break;
  }

  // Also match by checking node DBs for this primary filePath to get its resource ID
  if (!matchedRecord) {
    const normClean = cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath;
    for (const [dept, n] of Object.entries(NODES)) {
      try {
        const dbPath = path.resolve(__dirname, '..', '..', 'data', `node-${dept.toLowerCase().replace('&', '')}`, `node-${dept.toLowerCase().replace('&', '')}_db.json`);
        if (fs.existsSync(dbPath)) {
          const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
          const found = (dbData.resources || []).find(r => r.filePath === normClean || r.filePath === filePath);
          if (found && fileRecords[found.id]) {
            matchedRecord = fileRecords[found.id];
            break;
          }
        }
      } catch (e) {}
    }
  }

  // Also match by baseName or fileId
  if (!matchedRecord) {
    const baseName = path.basename(filePath);
    for (const record of Object.values(fileRecords)) {
      if (record.filename === baseName || record.fileId === baseName) {
        matchedRecord = record;
        break;
      }
    }
  }

  if (matchedRecord && matchedRecord.replicas) {
    const candidateReplicas = [...matchedRecord.replicas].sort((a, b) => {
      if (a.replicaNode === currentClusterLeader) return -1;
      if (b.replicaNode === currentClusterLeader) return 1;
      return 0;
    });

    for (const rep of candidateReplicas) {
      if (rep.status !== 'REPLICATED' || !rep.replicaFilePath) continue;

      const repNodeKey = rep.replicaNode;
      const repNode = NODES[repNodeKey];
      // Candidate node must be currently ONLINE
      if (!repNode || repNode.status !== 'ONLINE') continue;

      const cleanRepPath = rep.replicaFilePath.startsWith('/') ? rep.replicaFilePath.slice(1) : rep.replicaFilePath;
      const absRepPath = path.resolve(uploadsRoot, '..', cleanRepPath);

      // Verify physical existence
      if (!fs.existsSync(absRepPath)) continue;

      // Verify SHA-256 integrity before serving
      try {
        const buf = fs.readFileSync(absRepPath);
        const sum = crypto.createHash('sha256').update(buf).digest('hex');
        if (matchedRecord.primaryChecksum && sum !== matchedRecord.primaryChecksum) {
          console.warn(`[DownloadFailover] Checksum mismatch on replica ${repNodeKey}, skipping.`);
          continue;
        }

        console.log(`[DownloadFailover] ✓ Serving failover replica from Node ${repNodeKey}: ${rep.replicaFilePath}`);
        fileName = path.basename(matchedRecord.filename || fileName).replace(/[/\\?%*:|"<>]/g, '_');
        const storedExt = path.extname(absRepPath);
        if (!fileName.toLowerCase().endsWith(storedExt.toLowerCase())) {
          fileName = fileName + storedExt;
        }
        res.setHeader('X-NoteSync-Failover-Replica', repNodeKey);
        return res.download(absRepPath, fileName);
      } catch (readErr) {
        console.warn(`[DownloadFailover] Error reading replica: ${readErr.message}`);
      }
    }
  }

  return res.status(404).json({
    error: 'Requested file not found on primary node and no verified replica is currently available.'
  });
});

// Serve static client bundle if built
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`[API Gateway] Running on http://localhost:${PORT}`);
  console.log(`[API Gateway] WebSocket server listening for real-time DS events`);
  console.log(`=======================================================`);
});
