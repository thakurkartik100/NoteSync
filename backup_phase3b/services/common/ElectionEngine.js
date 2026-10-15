class ElectionEngine {
  constructor(nodeId = 'CE', processId = 1, peerNodes = []) {
    this.nodeId = nodeId.toUpperCase();
    this.processId = processId;
    this.peerNodes = peerNodes || [
      { nodeId: 'CE', processId: 1, port: 5001 },
      { nodeId: 'IT', processId: 2, port: 5002 },
      { nodeId: 'E&TC', processId: 3, port: 5003 }
    ];
    this.leader = 'E&TC'; // Default highest process ID node
    this.leaderProcessId = 3;
    this.state = 'NORMAL';
  }

  // 1. Bully Election Algorithm
  // Highest active process ID bullies lower nodes to become Leader
  runBullyElection(activeNodes = ['CE', 'IT', 'E&TC']) {
    const trace = [];
    trace.push(`[BULLY] Election initiated by process Node ${this.nodeId} (Process ID ${this.processId})`);

    // Filter active peers
    const activePeers = this.peerNodes.filter(p => activeNodes.includes(p.nodeId));
    
    // Find active nodes with higher Process IDs
    const higherPeers = activePeers.filter(p => p.processId > this.processId);

    if (higherPeers.length === 0) {
      // No higher node active -> this node becomes coordinator
      this.leader = this.nodeId;
      this.leaderProcessId = this.processId;
      trace.push(`[BULLY] No higher ID active node found. Node ${this.nodeId} proclaims itself COORDINATOR!`);
    } else {
      higherPeers.forEach(p => {
        trace.push(`[BULLY] Node ${this.nodeId} sends ELECTION message to higher Node ${p.nodeId} (ID ${p.processId})`);
      });

      // Highest active peer becomes coordinator
      const highestActive = activePeers.reduce((max, p) => p.processId > max.processId ? p : max, activePeers[0]);
      this.leader = highestActive.nodeId;
      this.leaderProcessId = highestActive.processId;
      trace.push(`[BULLY] Node ${highestActive.nodeId} (Process ID ${highestActive.processId}) wins election & broadcasts COORDINATOR msg.`);
    }

    return {
      algorithm: 'BULLY',
      initiator: this.nodeId,
      electedLeader: this.leader,
      leaderProcessId: this.leaderProcessId,
      trace,
      timestamp: new Date().toISOString()
    };
  }

  // 2. Ring Election Algorithm
  // Circulates ELECTION message around logical ring collecting active node IDs
  runRingElection(activeNodes = ['CE', 'IT', 'E&TC']) {
    const trace = [];
    trace.push(`[RING] Election initiated by Node ${this.nodeId} around logical node ring.`);

    const ringList = [];
    // Circulate through active peers in ring order
    this.peerNodes.forEach(peer => {
      if (activeNodes.includes(peer.nodeId)) {
        ringList.push(peer.processId);
        trace.push(`[RING] ELECTION msg passed to Node ${peer.nodeId} (ID ${peer.processId}) -> Appended to election ring list [${ringList.join(', ')}]`);
      } else {
        trace.push(`[RING] Node ${peer.nodeId} OFFLINE -> Skipped in ring circulation.`);
      }
    });

    const maxId = Math.max(...ringList);
    const newLeaderPeer = this.peerNodes.find(p => p.processId === maxId);
    
    this.leader = newLeaderPeer ? newLeaderPeer.nodeId : this.nodeId;
    this.leaderProcessId = maxId;

    trace.push(`[RING] Election message completed ring cycle. Max ID found: ${maxId}. Node ${this.leader} elected as Leader.`);

    return {
      algorithm: 'RING',
      initiator: this.nodeId,
      ringList,
      electedLeader: this.leader,
      leaderProcessId: this.leaderProcessId,
      trace,
      timestamp: new Date().toISOString()
    };
  }

  getLeader() {
    return {
      leader: this.leader,
      leaderProcessId: this.leaderProcessId
    };
  }
}

module.exports = ElectionEngine;
