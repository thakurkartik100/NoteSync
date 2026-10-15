class VectorClock {
  constructor(nodeId = 'CE', initialVector = null) {
    this.nodeId = nodeId.toUpperCase();
    // Default vector components for department nodes
    this.vector = initialVector || { CE: 0, IT: 0, 'E&TC': 0 };
    if (this.vector[this.nodeId] === undefined) {
      this.vector[this.nodeId] = 0;
    }
  }

  // Local event tick: V[i] = V[i] + 1
  tick(eventDescription = 'Local Event') {
    this.vector[this.nodeId] = (this.vector[this.nodeId] || 0) + 1;
    return {
      event: eventDescription,
      nodeId: this.nodeId,
      vector: { ...this.vector },
      timestamp: new Date().toISOString()
    };
  }

  // Send message event: tick local vector before sending
  sendEvent(eventDescription = 'Send Message') {
    this.vector[this.nodeId] = (this.vector[this.nodeId] || 0) + 1;
    return {
      event: eventDescription,
      senderNode: this.nodeId,
      vector: { ...this.vector },
      timestamp: new Date().toISOString()
    };
  }

  // Receive message event: V_local[k] = max(V_local[k], V_incoming[k]), then V_local[i]++
  receiveEvent(incomingVector, senderNode = 'UNKNOWN', eventDescription = 'Receive Message') {
    const previousVector = { ...this.vector };
    
    try {
      let parsed = incomingVector;
      if (typeof incomingVector === 'string') {
        try { parsed = JSON.parse(incomingVector); } catch (e) {}
      }
      if (parsed && typeof parsed === 'object') {
        Object.keys(parsed).forEach(key => {
          const k = String(key).toUpperCase();
          const val = Number(parsed[key]) || 0;
          this.vector[k] = Math.max(Number(this.vector[k]) || 0, val);
        });
      }
    } catch (e) {
      console.warn('[VectorClock receiveEvent error]:', e.message);
    }

    const currentVal = Number(this.vector[this.nodeId]) || 0;
    this.vector[this.nodeId] = currentVal + 1;

    return {
      event: eventDescription,
      nodeId: this.nodeId,
      senderNode,
      previousVector,
      incomingVector,
      newVector: { ...this.vector },
      timestamp: new Date().toISOString()
    };
  }

  // Causality Comparison Utility
  static compare(v1, v2) {
    let v1Greater = false;
    let v2Greater = false;

    const keys = Array.from(new Set([...Object.keys(v1 || {}), ...Object.keys(v2 || {})]));

    for (const key of keys) {
      const val1 = v1[key] || 0;
      const val2 = v2[key] || 0;
      if (val1 > val2) v1Greater = true;
      if (val2 > val1) v2Greater = true;
    }

    if (v1Greater && !v2Greater) return 'V1_DOMINATES_V2'; // v1 strictly succeeded v2
    if (v2Greater && !v1Greater) return 'V2_DOMINATES_V1'; // v2 strictly succeeded v1
    if (!v1Greater && !v2Greater) return 'EQUAL';
    return 'CONCURRENT'; // Parallel / Causally independent events
  }

  getVector() {
    return { ...this.vector };
  }
}

module.exports = VectorClock;
