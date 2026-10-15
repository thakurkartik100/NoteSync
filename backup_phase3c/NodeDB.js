const fs = require('fs');
const path = require('path');

class NodeDB {
  constructor(nodeName, dataDir) {
    this.nodeName = nodeName;
    this.dataDir = dataDir || path.join(__dirname, '..', '..', 'data', nodeName);
    this.dbFile = path.join(this.dataDir, `${nodeName}_db.json`);
    this.data = {
      users: [],
      resources: [],
      logs: [],
      nodeInfo: {
        nodeId: nodeName,
        department: nodeName.replace('node-', '').toUpperCase(),
        status: 'ONLINE',
        lastPing: new Date().toISOString()
      }
    };
    this.init();
  }

  init() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    if (fs.existsSync(this.dbFile)) {
      try {
        const raw = fs.readFileSync(this.dbFile, 'utf8');
        this.data = JSON.parse(raw);
      } catch (err) {
        console.error(`[DB ${this.nodeName}] Load error, re-initializing:`, err.message);
        this.seedSampleData();
        this.save();
      }
    } else {
      this.seedSampleData();
      this.save();
    }
  }

  seedSampleData() {
    const dept = this.nodeName.replace('node-', '').toUpperCase();
    let samples = [];

    if (dept === 'CE') {
      samples = [
        {
          id: 'res_ce_1',
          title: 'Distributed Systems Unit 1 & 2 Lecture Notes',
          description: 'Comprehensive notes covering Architecture, RPC, Middleware, and Lamport Clocks.',
          subject: 'Distributed Systems',
          department: 'CE',
          resourceType: 'Notes',
          fileName: 'DS_Unit1_Unit2_Notes.pdf',
          filePath: '/uploads/CE/sample_ds_notes.pdf',
          fileSize: 1024 * 450,
          uploadedBy: 'Prof. A. Sharma (CE)',
          uploadDate: new Date(Date.now() - 86400000 * 2).toISOString(),
          nodeId: 'node-ce'
        },
        {
          id: 'res_ce_2',
          title: 'Design & Analysis of Algorithms Previous Question Paper',
          description: 'End-sem question paper 2025 with answer key for Dynamic Programming & Graph Algorithms.',
          subject: 'Algorithms',
          department: 'CE',
          resourceType: 'Question Papers',
          fileName: 'DAA_Question_Paper_2025.pdf',
          filePath: '/uploads/CE/sample_daa_qp.pdf',
          fileSize: 1024 * 320,
          uploadedBy: 'Student Council (CE)',
          uploadDate: new Date(Date.now() - 86400000 * 5).toISOString(),
          nodeId: 'node-ce'
        }
      ];
    } else if (dept === 'IT') {
      samples = [
        {
          id: 'res_it_1',
          title: 'Cloud Computing & Virtualization Lab Manual',
          description: 'Lab experiment write-ups for Docker, Kubernetes, and AWS EC2 deployment.',
          subject: 'Cloud Computing',
          department: 'IT',
          resourceType: 'Lab Manuals',
          fileName: 'Cloud_Lab_Manual_2026.pdf',
          filePath: '/uploads/IT/sample_cloud_manual.pdf',
          fileSize: 1024 * 610,
          uploadedBy: 'Prof. R. Varma (IT)',
          uploadDate: new Date(Date.now() - 86400000 * 1).toISOString(),
          nodeId: 'node-it'
        },
        {
          id: 'res_it_2',
          title: 'Web Technologies Assignment 2 Solutions',
          description: 'REST API & Express.js middleware assignment solution code and document.',
          subject: 'Web Technologies',
          department: 'IT',
          resourceType: 'Assignments',
          fileName: 'WebTech_Assignment_2.pdf',
          filePath: '/uploads/IT/sample_webtech_assign.pdf',
          fileSize: 1024 * 280,
          uploadedBy: 'Rahul K. (BE IT)',
          uploadDate: new Date(Date.now() - 86400000 * 3).toISOString(),
          nodeId: 'node-it'
        }
      ];
    } else if (dept === 'E&TC') {
      samples = [
        {
          id: 'res_etc_1',
          title: 'Digital Signal Processing (DSP) Formula Sheet & Notes',
          description: 'Quick reference sheet for FFT, Z-Transform, and IIR Filter design.',
          subject: 'Digital Signal Processing',
          department: 'E&TC',
          resourceType: 'Notes',
          fileName: 'DSP_Quick_Reference.pdf',
          filePath: '/uploads/E&TC/sample_dsp_notes.pdf',
          fileSize: 1024 * 390,
          uploadedBy: 'Dr. P. Deshmukh (E&TC)',
          uploadDate: new Date(Date.now() - 86400000 * 4).toISOString(),
          nodeId: 'node-etc'
        },
        {
          id: 'res_etc_2',
          title: 'Embedded Systems Microcontroller Project Manual',
          description: 'ARM Cortex M4 interfacing lab guide and circuit schematics.',
          subject: 'Embedded Systems',
          department: 'E&TC',
          resourceType: 'Lab Manuals',
          fileName: 'Embedded_Lab_Manual.pdf',
          filePath: '/uploads/E&TC/sample_embedded_manual.pdf',
          fileSize: 1024 * 510,
          uploadedBy: 'Sneha M. (TE E&TC)',
          uploadDate: new Date(Date.now() - 86400000 * 6).toISOString(),
          nodeId: 'node-etc'
        }
      ];
    }

    this.data.resources = samples;
    this.data.users = [
      {
        id: 'u_student_1',
        name: 'Demo Student',
        email: 'student@college.edu',
        password: 'password123',
        department: dept
      }
    ];
  }

  save() {
    try {
      fs.writeFileSync(this.dbFile, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error(`[DB ${this.nodeName}] Save error:`, err.message);
    }
  }

  // Users
  findUserByEmail(email) {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  addUser(user) {
    const newUser = { id: 'u_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5), createdAt: new Date().toISOString(), ...user };
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  // Resources
  getResources(filters = {}) {
    let list = [...this.data.resources];
    if (filters.subject) {
      list = list.filter(r => r.subject.toLowerCase().includes(filters.subject.toLowerCase()));
    }
    if (filters.resourceType) {
      list = list.filter(r => r.resourceType.toLowerCase() === filters.resourceType.toLowerCase());
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(r => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
    }
    return list;
  }

  getResourceById(id) {
    return this.data.resources.find(r => r.id === id);
  }

  addResource(res) {
    const newRes = {
      id: 'res_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      uploadDate: new Date().toISOString(),
      ...res
    };
    this.data.resources.push(newRes);
    this.save();
    return newRes;
  }

  deleteResource(id, userId) {
    const idx = this.data.resources.findIndex(r => r.id === id);
    if (idx !== -1) {
      const deleted = this.data.resources.splice(idx, 1)[0];
      this.save();
      return deleted;
    }
    return null;
  }

  // Node State & Logs
  getNodeState() {
    return this.data.nodeInfo;
  }

  setNodeStatus(status) {
    this.data.nodeInfo.status = status;
    this.data.nodeInfo.lastPing = new Date().toISOString();
    this.save();
    return this.data.nodeInfo;
  }

  getLamportClock() {
    return typeof this.data.nodeInfo.lamportClock === 'number' ? this.data.nodeInfo.lamportClock : 0;
  }

  setLamportClock(clockVal) {
    this.data.nodeInfo.lamportClock = Math.max(this.getLamportClock(), Number(clockVal) || 0);
    this.save();
    return this.data.nodeInfo.lamportClock;
  }

  getVectorClock() {
    if (this.data.nodeInfo.vectorClock && typeof this.data.nodeInfo.vectorClock === 'object') {
      return { ...this.data.nodeInfo.vectorClock };
    }
    return { CE: 0, IT: 0, 'E&TC': 0 };
  }

  setVectorClock(vec) {
    const clean = { CE: 0, IT: 0, 'E&TC': 0 };
    if (vec && typeof vec === 'object') {
      ['CE', 'IT', 'E&TC'].forEach(k => {
        const raw = vec[k] !== undefined ? vec[k] : (vec[k.replace('&', '')] !== undefined ? vec[k.replace('&', '')] : 0);
        const num = Number(raw);
        clean[k] = (Number.isFinite(num) && num >= 0) ? num : 0;
      });
    }
    this.data.nodeInfo.vectorClock = clean;
    this.save();
    return clean;
  }

  addLog(logEntry) {
    const entry = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      ...logEntry
    };
    this.data.logs.unshift(entry);
    if (this.data.logs.length > 100) this.data.logs.pop(); // keep last 100
    this.save();
    return entry;
  }

  getLogs() {
    return this.data.logs;
  }
}

module.exports = NodeDB;
