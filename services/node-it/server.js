const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const NodeDB = require('../common/NodeDB');
const LamportClock = require('../common/LamportClock');
const VectorClock = require('../common/VectorClock');
const ElectionEngine = require('../common/ElectionEngine');

const NODE_ID = 'IT';
const DEPARTMENT = 'IT';
const PORT = process.env.PORT || 5002;

const app = express();
app.use(cors());
app.use(express.json());

const db = new NodeDB(`node-it`);
const clock = new LamportClock(`node-it`, db.getLamportClock());
const vectorClock = new VectorClock(DEPARTMENT, db.getVectorClock());
const electionEngine = new ElectionEngine(NODE_ID, 2);
if (db.getLeader()) {
  electionEngine.setLeader(db.getLeader());
}
electionEngine.onLeaderChange = (newLeader) => {
  db.setLeader(newLeader);
};

const uploadDir = path.join(__dirname, '..', '..', 'uploads', DEPARTMENT);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${DEPARTMENT}_${uniqueSuffix}${ext}`);
  }
});
const upload = multer({ storage });

app.get('/health', (req, res) => {
  const state = db.getNodeState();
  if (state.status === 'OFFLINE') {
    return res.status(503).json({
      nodeId: `node-it`,
      department: DEPARTMENT,
      status: 'OFFLINE',
      message: 'Node IT is down (Simulated Failure)',
      clock: clock.getClock(),
      vectorClock: vectorClock.getVector()
    });
  }
  clock.tick(`Health check handled on Node IT`);
  vectorClock.tick(`Health check Node IT`);

  res.json({
    nodeId: `node-it`,
    department: DEPARTMENT,
    status: 'ONLINE',
    port: PORT,
    processId: 2,
    clock: clock.getClock(),
    vectorClock: vectorClock.getVector(),
    leader: electionEngine.getLeader().leader,
    leaderProcessId: electionEngine.getLeader().leaderProcessId,
    electionState: electionEngine.getLeader().state,
    resourceCount: db.getResources().length,
    timestamp: new Date().toISOString()
  });
});

app.post('/status', (req, res) => {
  const { status } = req.body;
  if (!['ONLINE', 'OFFLINE'].includes(status)) {
    return res.status(400).json({ error: 'Status must be ONLINE or OFFLINE' });
  }
  const updated = db.setNodeStatus(status);
  clock.tick(`Node status changed to ${status}`);
  vectorClock.tick(`Status change ${status}`);
  db.addLog({ event: 'STATUS_CHANGE', details: `Node set to ${status}`, clock: clock.getClock() });
  res.json({ message: `Node IT status set to ${status}`, state: updated, clock: clock.getClock(), vectorClock: vectorClock.getVector() });
});

app.use((req, res, next) => {
  if (req.path === '/status' || req.path === '/health') return next();
  const state = db.getNodeState();
  if (state.status === 'OFFLINE') {
    return res.status(503).json({
      error: `Node IT (${DEPARTMENT}) is currently OFFLINE`,
      nodeId: `node-it`,
      status: 'OFFLINE'
    });
  }
  next();
});

app.get('/resources', (req, res) => {
  clock.tick(`Fetch resources Node IT`);
  vectorClock.tick(`Fetch resources Node IT`);
  const { subject, resourceType, search } = req.query;
  const list = db.getResources({ subject, resourceType, search });
  res.json({
    nodeId: `node-it`,
    department: DEPARTMENT,
    clock: clock.getClock(),
    vectorClock: vectorClock.getVector(),
    count: list.length,
    resources: list
  });
});

const handleFileUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.warn('[Node IT Multer Warning]:', err.message);
    }
    next();
  });
};

app.post('/resources', handleFileUpload, (req, res) => {
  try {
    const { title, description, subject, resourceType, uploadedBy, vector } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded or invalid file format' });
    }

    const filePath = `/uploads/${DEPARTMENT}/${req.file.filename}`;
    const fileName = req.file.originalname;
    const fileSize = req.file.size;

    const vSync = vectorClock.receiveEvent(vector, 'API-Gateway', `Upload:${title}`);
    db.setVectorClock(vSync.newVector);
    const incomingClock = Number(req.body.lamportClock);
    if (!isNaN(incomingClock) && incomingClock >= 0) {
      clock.receiveEvent(incomingClock, 'API-Gateway', `Upload:${title}`);
    } else {
      clock.tick(`Store resource [${title}] on Node IT`);
    }
    const currentClock = clock.getClock();
    db.setLamportClock(currentClock);

    const newRes = db.addResource({
      title: title || 'Untitled Note',
      description: description || '',
      subject: subject || 'Information Technology',
      department: DEPARTMENT,
      resourceType: resourceType || 'Notes',
      filePath,
      fileName,
      fileSize,
      uploadedBy: uploadedBy || 'Anonymous Student',
      nodeId: `node-it`,
      lamportClock: currentClock,
      vectorClock: vSync.newVector
    });

    db.addLog({ event: 'RESOURCE_CREATED', details: `Created ${newRes.title}`, clock: currentClock });

    res.status(201).json({
      message: `Resource saved on Node IT`,
      nodeId: `node-it`,
      clock: currentClock,
      vectorClock: vSync.newVector,
      resource: newRes
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/resources/:id', (req, res) => {
  const deleted = db.deleteResource(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Resource not found' });
  clock.tick(`Delete resource ${req.params.id}`);
  vectorClock.tick(`Delete resource ${req.params.id}`);
  res.json({ message: 'Resource deleted', deleted, clock: clock.getClock(), vectorClock: vectorClock.getVector() });
});

app.post('/rpc/beacon', (req, res) => {
  const { senderNode, status, vector } = req.body;
  const sync = vectorClock.receiveEvent(vector, senderNode, `Beacon:${senderNode}`);
  res.json({
    ack: 'BEACON_ACK',
    nodeId: NODE_ID,
    vectorClock: sync.newVector
  });
});

// RPC Election Trigger (Unit III Election Algorithms)
app.post('/rpc/election', (req, res) => {
  const { algorithm, activeNodes } = req.body;
  let result = null;
  if (algorithm === 'RING') {
    result = electionEngine.runRingElection(activeNodes || ['CE', 'IT', 'E&TC']);
  } else {
    result = electionEngine.runBullyElection(activeNodes || ['CE', 'IT', 'E&TC']);
  }
  if (result && result.electedLeader) {
    db.setLeader(result.electedLeader);
  }
  res.json(result);
});

// Live Distributed Election Trigger (starts real HTTP Bully exchange)
app.post('/rpc/election/live', async (req, res) => {
  try {
    const result = await electionEngine.startLiveBullyElection(NODE_ID, req.body || {});
    if (result && result.electedLeader) {
      db.setLeader(result.electedLeader);
      db.addLog({
        event: 'ELECTION_WON',
        details: `Leader is now Node ${result.electedLeader}`,
        clock: clock.getClock()
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ status: 'ERROR', error: err.message });
  }
});

// Election Protocol Message Receiver (inter-node communication)
app.post('/rpc/election/message', (req, res) => {
  const response = electionEngine.handleElectionMessage(req.body);
  if (req.body && req.body.type === 'COORDINATOR' && req.body.leader) {
    db.setLeader(req.body.leader);
    db.addLog({
      event: 'COORDINATOR_ADOPTED',
      details: `Adopted leader Node ${req.body.leader}`,
      clock: clock.getClock()
    });
  }
  res.json(response);
});

// Current Leader Status
app.get('/election/leader', (req, res) => {
  res.json(electionEngine.getStatus());
});

// ── Distributed Mutual Exclusion: Leader-Coordinated Locks ──
const activeResourceLocks = new Map();

app.post('/rpc/lock/acquire', (req, res) => {
  const { resourceId, requesterNode, leaseMs = 5000 } = req.body || {};
  if (!resourceId) return res.status(400).json({ error: 'resourceId is required' });

  const now = Date.now();
  const existing = activeResourceLocks.get(resourceId);

  if (existing && existing.expiresAt > now && existing.holder !== requesterNode) {
    return res.status(423).json({
      status: 'LOCKED',
      granted: false,
      message: `Resource ${resourceId} is locked by Node ${existing.holder}`,
      holder: existing.holder,
      expiresInMs: existing.expiresAt - now
    });
  }

  const lockRecord = {
    resourceId,
    holder: requesterNode || NODE_ID,
    grantedAt: now,
    expiresAt: now + Number(leaseMs),
    leaseMs: Number(leaseMs)
  };
  activeResourceLocks.set(resourceId, lockRecord);

  clock.tick(`Lock acquired: ${resourceId} by ${lockRecord.holder}`);
  db.addLog({
    event: 'LOCK_ACQUIRED',
    details: `Resource ${resourceId} locked by ${lockRecord.holder} for ${leaseMs}ms`,
    clock: clock.getClock()
  });

  res.json({
    status: 'GRANTED',
    granted: true,
    resourceId,
    holder: lockRecord.holder,
    expiresAt: new Date(lockRecord.expiresAt).toISOString(),
    clock: clock.getClock()
  });
});

app.post('/rpc/lock/release', (req, res) => {
  const { resourceId, requesterNode } = req.body || {};
  if (!resourceId) return res.status(400).json({ error: 'resourceId is required' });

  const existing = activeResourceLocks.get(resourceId);
  if (!existing) {
    return res.json({ status: 'NOT_LOCKED', message: 'No active lock found' });
  }

  if (requesterNode && existing.holder !== requesterNode && existing.expiresAt > Date.now()) {
    return res.status(403).json({
      status: 'DENIED',
      message: `Only holder Node ${existing.holder} can release this lock`
    });
  }

  activeResourceLocks.delete(resourceId);
  clock.tick(`Lock released: ${resourceId}`);
  db.addLog({
    event: 'LOCK_RELEASED',
    details: `Resource ${resourceId} lock released`,
    clock: clock.getClock()
  });

  res.json({ status: 'RELEASED', resourceId });
});

app.get('/rpc/lock/status', (req, res) => {
  const now = Date.now();
  const locks = [];
  for (const [id, rec] of activeResourceLocks.entries()) {
    if (rec.expiresAt > now) {
      locks.push({ ...rec, remainingMs: rec.expiresAt - now });
    } else {
      activeResourceLocks.delete(id);
    }
  }
  res.json({ activeLocks: locks, count: locks.length });
});

app.post('/rpc/execute', (req, res) => {
  const { procedure, params, senderClock, vector } = req.body;
  const syncRecord = clock.receiveEvent(senderClock || 0, req.body.senderId || 'Gateway', `RPC:${procedure}`);
  const vSync = vectorClock.receiveEvent(vector, req.body.senderId || 'Gateway', `RPC:${procedure}`);

  let result = null;
  if (procedure === 'searchResources') {
    result = db.getResources(params || {});
  } else if (procedure === 'getNodeStats') {
    result = {
      nodeId: `node-it`,
      department: DEPARTMENT,
      totalResources: db.getResources().length,
      vectorClock: vSync.newVector,
      nodeState: db.getNodeState()
    };
  } else {
    result = { status: 'OK', procedure, executedAt: new Date().toISOString() };
  }

  res.json({
    rpcStatus: 'SUCCESS',
    nodeId: `node-it`,
    procedure,
    result,
    lamportSync: syncRecord,
    vectorClock: vSync.newVector,
    nodeClock: clock.getClock()
  });
});

// ── Phase 2A: Receive a replica file from the gateway ──
const replicaUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `REPLICA_${DEPARTMENT}_${uniqueSuffix}${ext}`);
    }
  })
});

app.post('/rpc/replica', replicaUpload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'FAILED', error: 'No file received' });
    }
    const { originalResourceId, primaryNode, primaryChecksum } = req.body;
    if (!originalResourceId || !primaryNode || !primaryChecksum) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ status: 'FAILED', error: 'Missing required fields: originalResourceId, primaryNode, primaryChecksum' });
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    const replicaChecksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const verified = replicaChecksum === primaryChecksum;

    if (!verified) {
      // Integrity failure — delete invalid temporary file and return FAILED
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      console.error(`[Node IT Replica] Checksum mismatch for ${originalResourceId}: expected ${primaryChecksum}, got ${replicaChecksum}`);
      return res.status(400).json({
        status: 'FAILED',
        error: `Checksum mismatch: expected ${primaryChecksum}, got ${replicaChecksum}`,
        replicaNode: DEPARTMENT,
        verified: false,
        originalResourceId
      });
    }

    const replicaFilePath = `/uploads/${DEPARTMENT}/${req.file.filename}`;
    const incomingClock = Number(req.body.lamportClock);
    if (!isNaN(incomingClock) && incomingClock >= 0) {
      clock.receiveEvent(incomingClock, primaryNode, `Replica received from ${primaryNode}: ${originalResourceId}`);
    } else {
      clock.tick(`Replica received from ${primaryNode}: ${originalResourceId}`);
    }
    const currentClock = clock.getClock();
    db.setLamportClock(currentClock);

    // Vector Clock sync on replica reception
    const vSync = vectorClock.receiveEvent(req.body.vectorClock, primaryNode, `Replica:${originalResourceId}`);
    db.setVectorClock(vSync.newVector);

    db.addLog({ event: 'REPLICA_RECEIVED', details: `Replica of ${originalResourceId} from ${primaryNode}, verified=true`, clock: currentClock, vectorClock: vSync.newVector });

    res.json({
      status: 'SUCCESS',
      replicaNode: DEPARTMENT,
      replicaFilePath,
      replicaChecksum,
      verified: true,
      originalResourceId,
      clock: currentClock,
      vectorClock: vSync.newVector,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ status: 'FAILED', error: err.message });
  }
});

app.get('/logs', (req, res) => {
  res.json({ nodeId: `node-it`, logs: db.getLogs(), clock: clock.getClock(), vectorClock: vectorClock.getVector() });
});

app.listen(PORT, () => {
  console.log(`[Node IT Service] Running on port ${PORT} (Department: ${DEPARTMENT}, Process ID: 2)`);
});
