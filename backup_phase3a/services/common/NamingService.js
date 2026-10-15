class NamingService {
  constructor() {
    // Registry mapping logical names to physical addresses and ports
    this.directory = {
      'node://ce': { nodeId: 'node-ce', department: 'CE', host: 'localhost', port: 5001, protocol: 'HTTP/RPC' },
      'node://it': { nodeId: 'node-it', department: 'IT', host: 'localhost', port: 5002, protocol: 'HTTP/RPC' },
      'node://etc': { nodeId: 'node-etc', department: 'E&TC', host: 'localhost', port: 5003, protocol: 'HTTP/RPC' },
      'gateway://api': { nodeId: 'api-gateway', department: 'ROUTER', host: 'localhost', port: 5000, protocol: 'HTTP/WS' }
    };
  }

  // Resolve logical URI name to physical endpoint
  resolveURI(logicalURI) {
    const uri = logicalURI.toLowerCase();
    
    if (uri.includes('/ce') || uri.includes('dept=ce')) return this.directory['node://ce'];
    if (uri.includes('/it') || uri.includes('dept=it')) return this.directory['node://it'];
    if (uri.includes('/etc') || uri.includes('/e&tc') || uri.includes('dept=etc')) return this.directory['node://etc'];

    return this.directory['gateway://api'];
  }

  // Register new dynamic endpoint
  registerEndpoint(logicalName, targetConfig) {
    this.directory[logicalName] = {
      registeredAt: new Date().toISOString(),
      ...targetConfig
    };
    return this.directory[logicalName];
  }

  getDirectory() {
    return this.directory;
  }
}

module.exports = NamingService;
