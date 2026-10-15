/**
 * ElectionEngine.js — Distributed Leader Election Engine
 * 
 * Supports both:
 * 1. Live Distributed Bully Election over real HTTP communication between department processes.
 * 2. Backward-compatible synchronous/simulation methods (runBullyElection, runRingElection) for Unit III syllabus audits.
 */

class ElectionEngine {
  constructor(nodeId = 'CE', processId = 1, peerNodes = null) {
    this.nodeId = String(nodeId).toUpperCase();
    this.processId = Number(processId) || 1;
    this.peerNodes = peerNodes || [
      { nodeId: 'CE', processId: 1, port: 5001, url: 'http://localhost:5001' },
      { nodeId: 'IT', processId: 2, port: 5002, url: 'http://localhost:5002' },
      { nodeId: 'E&TC', processId: 3, port: 5003, url: 'http://localhost:5003' }
    ];

    // Ensure all peers have URLs and ports
    this.peerNodes = this.peerNodes.map(p => ({
      nodeId: p.nodeId,
      processId: p.processId,
      port: p.port || (p.nodeId === 'CE' ? 5001 : (p.nodeId === 'IT' ? 5002 : 5003)),
      url: p.url || `http://localhost:${p.port || (p.nodeId === 'CE' ? 5001 : (p.nodeId === 'IT' ? 5002 : 5003))}`
    }));

    this.leader = null;
    this.leaderProcessId = null;
    this.state = 'NORMAL'; // 'NORMAL' | 'ELECTION'
    this.electionInProgress = false;
    this.electionHistory = [];
    this.onLeaderChange = null;
  }

  // ──────────────────────────────────────────────
  // Backward-Compatible Syllabus Methods (Synchronous)
  // ──────────────────────────────────────────────

  runBullyElection(activeNodes = ['CE', 'IT', 'E&TC']) {
    const trace = [];
    trace.push(`[BULLY] Election initiated by process Node ${this.nodeId} (Process ID ${this.processId})`);

    const activePeers = this.peerNodes.filter(p => activeNodes.includes(p.nodeId));
    const higherPeers = activePeers.filter(p => p.processId > this.processId);

    if (higherPeers.length === 0) {
      this.leader = this.nodeId;
      this.leaderProcessId = this.processId;
      trace.push(`[BULLY] No higher ID active node found. Node ${this.nodeId} proclaims itself COORDINATOR!`);
    } else {
      higherPeers.forEach(p => {
        trace.push(`[BULLY] Node ${this.nodeId} sends ELECTION message to higher Node ${p.nodeId} (ID ${p.processId})`);
      });

      const highestActive = activePeers.reduce((max, p) => p.processId > max.processId ? p : max, activePeers[0]);
      this.leader = highestActive ? highestActive.nodeId : this.nodeId;
      this.leaderProcessId = highestActive ? highestActive.processId : this.processId;
      trace.push(`[BULLY] Node ${this.leader} (Process ID ${this.leaderProcessId}) wins election & broadcasts COORDINATOR msg.`);
    }

    const result = {
      algorithm: 'BULLY',
      initiator: this.nodeId,
      electedLeader: this.leader,
      leaderProcessId: this.leaderProcessId,
      trace,
      timestamp: new Date().toISOString()
    };
    this.recordHistory(result);
    return result;
  }

  runRingElection(activeNodes = ['CE', 'IT', 'E&TC']) {
    const trace = [];
    trace.push(`[RING] Election initiated by Node ${this.nodeId} around logical node ring.`);

    const ringList = [];
    this.peerNodes.forEach(peer => {
      if (activeNodes.includes(peer.nodeId)) {
        ringList.push(peer.processId);
        trace.push(`[RING] ELECTION msg passed to Node ${peer.nodeId} (ID ${peer.processId}) -> Appended to election ring list [${ringList.join(', ')}]`);
      } else {
        trace.push(`[RING] Node ${peer.nodeId} OFFLINE -> Skipped in ring circulation.`);
      }
    });

    const maxId = ringList.length > 0 ? Math.max(...ringList) : this.processId;
    const newLeaderPeer = this.peerNodes.find(p => p.processId === maxId);

    this.leader = newLeaderPeer ? newLeaderPeer.nodeId : this.nodeId;
    this.leaderProcessId = maxId;

    trace.push(`[RING] Election message completed ring cycle. Max ID found: ${maxId}. Node ${this.leader} elected as Leader.`);

    const result = {
      algorithm: 'RING',
      initiator: this.nodeId,
      ringList,
      electedLeader: this.leader,
      leaderProcessId: this.leaderProcessId,
      trace,
      timestamp: new Date().toISOString()
    };
    this.recordHistory(result);
    return result;
  }

  // ──────────────────────────────────────────────
  // Real Distributed HTTP Bully Election
  // ──────────────────────────────────────────────

  /**
   * Start a live Bully election across department node processes over HTTP.
   * If a higher process ID responds with OK, this node waits for COORDINATOR.
   * If no higher process ID responds within timeout, this node proclaims itself COORDINATOR.
   */
  async startLiveBullyElection(initiator = null, options = {}) {
    if (this.electionInProgress && !options.force) {
      return {
        status: 'IN_PROGRESS',
        message: `Election already in progress on Node ${this.nodeId}`,
        currentLeader: this.leader
      };
    }

    this.electionInProgress = true;
    this.state = 'ELECTION';
    const trace = [];
    const sourceNode = initiator || this.nodeId;
    trace.push(`[BULLY-LIVE] Node ${this.nodeId} (PID ${this.processId}) initiated election (source: ${sourceNode})`);

    try {
      // Find peers with higher Process ID
      const higherPeers = this.peerNodes.filter(p => p.processId > this.processId && p.nodeId !== this.nodeId);

      let anyHigherAnswered = false;

      if (higherPeers.length > 0) {
        trace.push(`[BULLY-LIVE] Higher PID peers identified: ${higherPeers.map(p => `${p.nodeId} (PID ${p.processId})`).join(', ')}`);

        // Send ELECTION message to each higher peer in parallel with a timeout
        const promises = higherPeers.map(async (peer) => {
          try {
            trace.push(`[BULLY-LIVE] -> Sending ELECTION to ${peer.nodeId} at ${peer.url}/rpc/election/message`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1200);

            const resp = await fetch(`${peer.url}/rpc/election/message`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'ELECTION',
                senderNode: this.nodeId,
                senderProcessId: this.processId
              }),
              signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (resp.ok) {
              const data = await resp.json();
              if (data && data.type === 'OK') {
                trace.push(`[BULLY-LIVE] <- Received OK from higher Node ${peer.nodeId}`);
                return { peer: peer.nodeId, answered: true };
              }
            }
            trace.push(`[BULLY-LIVE] Node ${peer.nodeId} returned non-OK status: ${resp.status}`);
            return { peer: peer.nodeId, answered: false };
          } catch (err) {
            trace.push(`[BULLY-LIVE] Node ${peer.nodeId} unreachable or timed out (${err.message})`);
            return { peer: peer.nodeId, answered: false };
          }
        });

        const results = await Promise.all(promises);
        anyHigherAnswered = results.some(r => r.answered);
      }

      if (!anyHigherAnswered) {
        // No higher node answered — this node wins!
        trace.push(`[BULLY-LIVE] No higher node responded. Node ${this.nodeId} wins election and declares itself COORDINATOR.`);
        this.leader = this.nodeId;
        this.leaderProcessId = this.processId;
        this.state = 'NORMAL';
        if (typeof this.onLeaderChange === 'function') {
          try { this.onLeaderChange(this.leader, this.leaderProcessId); } catch (e) {}
        }

        // Broadcast COORDINATOR to all other active peers
        await this.broadcastCoordinator(trace);

        const summary = {
          algorithm: 'BULLY-LIVE',
          status: 'SUCCESS',
          initiator: sourceNode,
          electedLeader: this.leader,
          leaderProcessId: this.leaderProcessId,
          trace,
          timestamp: new Date().toISOString()
        };
        this.recordHistory(summary);
        return summary;
      } else {
        trace.push(`[BULLY-LIVE] Higher node(s) responded with OK. Waiting for COORDINATOR announcement...`);
        // Wait briefly for the higher node to finish its election and broadcast COORDINATOR
        await new Promise(r => setTimeout(r, 800));

        const summary = {
          algorithm: 'BULLY-LIVE',
          status: 'HANDED_OFF_TO_HIGHER',
          initiator: sourceNode,
          electedLeader: this.leader,
          leaderProcessId: this.leaderProcessId,
          trace,
          timestamp: new Date().toISOString()
        };
        this.recordHistory(summary);
        return summary;
      }
    } finally {
      this.electionInProgress = false;
      if (this.state === 'ELECTION') this.state = 'NORMAL';
    }
  }

  /**
   * Broadcast COORDINATOR message to all other department nodes.
   */
  async broadcastCoordinator(trace = []) {
    const peersToNotify = this.peerNodes.filter(p => p.nodeId !== this.nodeId);
    trace.push(`[BULLY-LIVE] Broadcasting COORDINATOR [Leader: Node ${this.nodeId}, PID ${this.processId}] to peers...`);

    const promises = peersToNotify.map(async (peer) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200);

        const resp = await fetch(`${peer.url}/rpc/election/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'COORDINATOR',
            leader: this.nodeId,
            leaderProcessId: this.processId,
            senderNode: this.nodeId
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (resp.ok) {
          trace.push(`[BULLY-LIVE] -> COORDINATOR acknowledged by Node ${peer.nodeId}`);
        } else {
          trace.push(`[BULLY-LIVE] -> Node ${peer.nodeId} returned ${resp.status} to COORDINATOR`);
        }
      } catch (e) {
        trace.push(`[BULLY-LIVE] -> Failed to send COORDINATOR to Node ${peer.nodeId} (${e.message})`);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Handle an incoming election protocol message over HTTP.
   * Message types:
   * 1. 'ELECTION': Sent by a lower process. Respond immediately with 'OK', then start own election if not already running.
   * 2. 'COORDINATOR': Sent by winning leader. Adopt leader state.
   */
  handleElectionMessage(message) {
    if (!message || typeof message !== 'object') {
      return { status: 'REJECTED', error: 'Malformed message: must be non-null object' };
    }

    const { type, senderNode, senderProcessId, leader, leaderProcessId } = message;

    if (type === 'ELECTION') {
      const sId = Number(senderProcessId);
      // Validate sender process ID
      if (Number.isFinite(sId) && sId < this.processId) {
        // Lower node is initiating. Bully protocol dictates: respond OK, then run own election in background
        setImmediate(() => {
          this.startLiveBullyElection(senderNode).catch(err => {
            console.warn(`[ElectionEngine ${this.nodeId}] Secondary election error:`, err.message);
          });
        });

        return {
          type: 'OK',
          receiverNode: this.nodeId,
          receiverProcessId: this.processId,
          message: `Node ${this.nodeId} (PID ${this.processId}) acknowledges election from lower PID ${sId}`
        };
      } else {
        // Equal or higher sender: acknowledge but do not bully
        return {
          type: 'OK',
          receiverNode: this.nodeId,
          receiverProcessId: this.processId
        };
      }
    }

    if (type === 'COORDINATOR') {
      if (!leader) {
        return { status: 'REJECTED', error: 'Missing leader in COORDINATOR message' };
      }
      this.leader = String(leader).toUpperCase();
      this.leaderProcessId = Number(leaderProcessId) || null;
      this.state = 'NORMAL';
      this.electionInProgress = false;

      this.recordHistory({
        event: 'COORDINATOR_RECEIVED',
        leader: this.leader,
        leaderProcessId: this.leaderProcessId,
        senderNode: senderNode || leader,
        timestamp: new Date().toISOString()
      });

      if (typeof this.onLeaderChange === 'function') {
        try { this.onLeaderChange(this.leader, this.leaderProcessId); } catch (e) {}
      }

      return {
        status: 'ACCEPTED',
        leader: this.leader,
        leaderProcessId: this.leaderProcessId
      };
    }

    return { status: 'REJECTED', error: `Unknown message type: ${type}` };
  }

  recordHistory(entry) {
    this.electionHistory.unshift({
      id: 'elec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString(),
      ...entry
    });
    if (this.electionHistory.length > 30) this.electionHistory.pop();
  }

  setLeader(leaderNodeId, leaderProcessId = null) {
    this.leader = leaderNodeId ? String(leaderNodeId).toUpperCase() : null;
    this.leaderProcessId = leaderProcessId;
  }

  getLeader() {
    return {
      nodeId: this.nodeId,
      processId: this.processId,
      leader: this.leader,
      leaderProcessId: this.leaderProcessId,
      state: this.state,
      electionInProgress: this.electionInProgress
    };
  }

  getStatus() {
    return {
      nodeId: this.nodeId,
      processId: this.processId,
      leader: this.leader,
      leaderProcessId: this.leaderProcessId,
      state: this.state,
      electionInProgress: this.electionInProgress,
      peerNodes: this.peerNodes,
      history: this.electionHistory.slice(0, 10)
    };
  }
}

module.exports = ElectionEngine;
