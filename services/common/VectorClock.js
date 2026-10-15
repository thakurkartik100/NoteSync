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
        ['CE', 'IT', 'E&TC'].forEach(k => {
          const raw = parsed[k] !== undefined ? parsed[k] : (parsed[k.replace('&', '')] !== undefined ? parsed[k.replace('&', '')] : 0);
          const num = Number(raw);
          const val = (Number.isFinite(num) && num >= 0) ? num : 0;
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
  // Returns:
  // - 'BEFORE' if v1 causally precedes v2 (v1 <= v2 and v1 != v2)
  // - 'AFTER' if v1 causally follows v2 (v2 <= v1 and v2 != v1)
  // - 'EQUAL' if v1 == v2
  // - 'CONCURRENT' if neither dominates the other
  static compare(v1, v2) {
    const clean1 = VectorClock.sanitize(v1);
    const clean2 = VectorClock.sanitize(v2);

    let v1Greater = false;
    let v2Greater = false;

    const keys = ['CE', 'IT', 'E&TC'];

    for (const key of keys) {
      const val1 = clean1[key] || 0;
      const val2 = clean2[key] || 0;
      if (val1 > val2) v1Greater = true;
      if (val2 > val1) v2Greater = true;
    }

    if (!v1Greater && !v2Greater) return 'EQUAL';
    if (!v1Greater && v2Greater) return 'BEFORE'; // v1 <= v2
    if (v1Greater && !v2Greater) return 'AFTER';  // v1 >= v2
    return 'CONCURRENT'; // Neither dominates
  }

  static sanitize(vec) {
    const res = { CE: 0, IT: 0, 'E&TC': 0 };
    if (!vec || typeof vec !== 'object') return res;
    ['CE', 'IT', 'E&TC'].forEach(k => {
      const raw = vec[k] !== undefined ? vec[k] : (vec[k.replace('&', '')] !== undefined ? vec[k.replace('&', '')] : 0);
      const num = Number(raw);
      res[k] = (Number.isFinite(num) && num >= 0) ? num : 0;
    });
    return res;
  }

  getVector() {
    return { ...this.vector };
  }
}

module.exports = VectorClock;
