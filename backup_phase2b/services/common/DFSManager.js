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
}

module.exports = DFSManager;
