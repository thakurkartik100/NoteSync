class LamportClock {
  constructor(nodeId = 'node') {
    this.nodeId = nodeId;
    this.clock = 0;
  }

  // Increment clock for local event
  tick(eventDescription = 'Local Event') {
    this.clock += 1;
    const record = {
      event: eventDescription,
      nodeId: this.nodeId,
      clock: this.clock,
      timestamp: new Date().toISOString()
    };
    return record;
  }

  // Send event timestamp
  sendEvent(eventDescription = 'Send Message') {
    this.clock += 1;
    return {
      event: eventDescription,
      senderNode: this.nodeId,
      clock: this.clock,
      timestamp: new Date().toISOString()
    };
  }

  // Update clock on receive event: L_new = max(L_local, L_msg) + 1
  receiveEvent(receivedClock, senderNode, eventDescription = 'Receive Message') {
    const oldClock = this.clock;
    this.clock = Math.max(this.clock, Number(receivedClock)) + 1;
    return {
      event: eventDescription,
      nodeId: this.nodeId,
      senderNode,
      previousClock: oldClock,
      receivedClock,
      newClock: this.clock,
      timestamp: new Date().toISOString()
    };
  }

  getClock() {
    return this.clock;
  }
}

module.exports = LamportClock;
