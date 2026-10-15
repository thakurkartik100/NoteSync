const NamingService = require('./NamingService');
const VectorClock = require('./VectorClock');

class DSMiddleware {
  constructor(nodeId = 'GATEWAY') {
    this.nodeId = nodeId.toUpperCase();
    this.namingService = new NamingService();
    this.vectorClock = new VectorClock(this.nodeId);
    this.beacons = {};
  }

  // Location Transparency Middleware
  resolveLocation(departmentKey) {
    const key = (departmentKey || 'CE').toUpperCase();
    const formattedKey = key === 'E&TC' ? 'etc' : key;
    return this.namingService.resolveURI(`node://${formattedKey}`);
  }

  // Beacon Protocol Ping (Unit III Beacon Protocol)
  handleBeaconPing(senderNode, status = 'ONLINE', senderVector = null) {
    const syncResult = this.vectorClock.receiveEvent(senderVector, senderNode, `BEACON_PING:${senderNode}`);
    this.beacons[senderNode] = {
      nodeId: senderNode,
      status,
      lastBeaconTime: new Date().toISOString(),
      vector: syncResult.newVector
    };
    return {
      ack: 'BEACON_ACK',
      receiverNode: this.nodeId,
      beacons: this.beacons,
      vectorSync: syncResult
    };
  }

  getBeacons() {
    return this.beacons;
  }
}

module.exports = DSMiddleware;
