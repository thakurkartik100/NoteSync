const fs = require('fs');
const path = require('path');

class DFSManager {
  constructor(masterDir) {
    this.masterDir = masterDir || path.join(__dirname, '..', '..', 'data', 'dfs_master');
    this.catalogFile = path.join(this.masterDir, 'dfs_catalog.json');
    this.catalog = {
      fileNamespace: {},
      chunkNodes: {
        CE: { nodeId: 'node-ce', port: 5001, status: 'ONLINE' },
        IT: { nodeId: 'node-it', port: 5002, status: 'ONLINE' },
        'E&TC': { nodeId: 'node-etc', port: 5003, status: 'ONLINE' }
      }
    };
    this.init();
  }

  init() {
    if (!fs.existsSync(this.masterDir)) {
      fs.mkdirSync(this.masterDir, { recursive: true });
    }
    if (fs.existsSync(this.catalogFile)) {
      try {
        const raw = fs.readFileSync(this.catalogFile, 'utf8');
        this.catalog = JSON.parse(raw);
      } catch (err) {
        this.save();
      }
    } else {
      this.save();
    }
  }

  save() {
    try {
      fs.writeFileSync(this.catalogFile, JSON.stringify(this.catalog, null, 2), 'utf8');
    } catch (err) {}
  }

  // Register a file into Distributed File System (DFS)
  // replicaResults is an optional array of { replicaNode, replicaFilePath, replicaChecksum, verified, status }
  registerDFSFile(fileMeta, replicaResults) {
    const fileId = fileMeta.id || 'dfs_' + Date.now();
    const primaryDept = (fileMeta.department || 'CE').toUpperCase();
    
    // Determine replica departments (Unit IV Replication) — replicate to ALL other nodes
    const allDepts = ['CE', 'IT', 'E&TC'];
    const replicaDepts = allDepts.filter(d => d !== primaryDept);

    // Build replica entries from real results if provided, otherwise mark as PENDING
    const replicas = replicaDepts.map(dept => {
      const result = (replicaResults || []).find(r => r.replicaNode === dept);
      if (result && result.status === 'SUCCESS') {
        return {
          replicaNode: dept,
          replicaFilePath: result.replicaFilePath,
          replicaChecksum: result.replicaChecksum,
          verified: result.verified,
          status: 'REPLICATED',
          clock: result.clock,
          timestamp: result.timestamp
        };
      }
      return {
        replicaNode: dept,
        status: (result && result.status) || 'PENDING',
        error: result ? result.error : undefined
      };
    });

    const dfsRecord = {
      fileId,
      filename: fileMeta.fileName || fileMeta.title + '.pdf',
      title: fileMeta.title,
      subject: fileMeta.subject,
      chunkSizeKb: Math.round((fileMeta.fileSize || 1024 * 400) / 1024),
      primaryNode: primaryDept,
      replicaNode: replicaDepts[0] || 'IT',
      lamportClock: fileMeta.lamportClock || 0,
      primaryChecksum: fileMeta.primaryChecksum || null,
      replicas,
      chunkLocations: [
        { chunkId: `${fileId}_c0`, primary: primaryDept, replicas: replicaDepts, status: 'AVAILABLE' }
      ],
      createdAt: new Date().toISOString()
    };

    this.catalog.fileNamespace[fileId] = dfsRecord;
    this.save();
    return dfsRecord;
  }

  getDFSCatalog() {
    return this.catalog;
  }

  getFileRecord(fileId) {
    return this.catalog.fileNamespace[fileId] || null;
  }

  // Find a DFS record by primary or replica file path
  findRecordByPath(filePath) {
    if (!filePath) return null;
    const clean = filePath.startsWith('/') ? filePath : '/' + filePath;
    for (const record of Object.values(this.catalog.fileNamespace)) {
      if (record.filename && (filePath.endsWith(record.filename) || record.filename === filePath)) {
        return record;
      }
      if (record.replicas) {
        for (const rep of record.replicas) {
          if (rep.replicaFilePath === clean || rep.replicaFilePath === filePath) {
            return record;
          }
        }
      }
    }
    return null;
  }

  // Update existing replica record in-place to avoid duplicate entries
  updateReplicaRecord(fileId, replicaData) {
    const record = this.catalog.fileNamespace[fileId];
    if (!record) return null;

    if (!record.replicas) record.replicas = [];
    const index = record.replicas.findIndex(r => r.replicaNode === replicaData.replicaNode);
    if (index >= 0) {
      record.replicas[index] = { ...record.replicas[index], ...replicaData };
    } else {
      record.replicas.push(replicaData);
    }
    this.save();
    return record;
  }

  // Remove a file entry from DFS catalog
  removeDFSFile(fileId) {
    if (this.catalog.fileNamespace && this.catalog.fileNamespace[fileId]) {
      const removed = this.catalog.fileNamespace[fileId];
      delete this.catalog.fileNamespace[fileId];
      this.catalog.totalFiles = Math.max(0, (this.catalog.totalFiles || 1) - 1);
      this.save();
      return removed;
    }
    return null;
  }
}

module.exports = DFSManager;
