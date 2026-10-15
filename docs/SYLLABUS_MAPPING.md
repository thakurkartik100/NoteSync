# Syllabus Mapping – NoteSync Project

| Unit | Topic | Implementation Status |
|------|-------|------------------------|
| **1** | Distributed System Foundations (processes, messaging, RPC) | **A** – Implemented and verified (Node servers expose HTTP & WebSocket APIs, tests confirm RPC calls).
|      | Failure detection & heartbeat | **A** – Heartbeat endpoint (`/health`) and WS ping/pong implemented; verified by API health test.
|      | Naming / service discovery | **C** – Demo‑only (static config files in `services/common/NodeRegistry.js`). No dynamic discovery.
| **2** | Replication & consistency (DFS, checksum, repair) | **A** – File upload replicates to all three nodes, SHA‑256 verification, automatic repair on checksum mismatch (tested in Phase 3C scripts).
|      | Quorum & eventual consistency | **B** – Replication works, but no explicit quorum logic exercised in tests.
|      | Distributed locking / mutual exclusion | **A** – Bully‑based leader election with lock endpoint; lock acquisition validated in demo UI.
| **3** | Logical clocks (Lamport) | **A** – `LamportClock.js` integrated; timestamps attached to operations; verified by logs.
|      | Vector clocks | **A** – `VectorClock.js` integrated; version vectors compared on updates; functional in backend.
|      | Leader election (Bully) | **A** – `ElectionEngine.js` implements Bully algorithm; election triggers on node start/failure (observed in logs).
| **4** | Distributed snapshots & global state | **C** – Snapshot demo script present but not integrated into production flow.
|      | Deadlock detection | **D** – Not implemented.
|      | Advanced fault tolerance (dynamic reconfiguration) | **B** – Failover works; dynamic node addition not covered.

**Legend**\
- **A** – Implemented and runtime‑verified.\
- **B** – Implemented but not fully verified by automated tests.\
- **C** – Demonstration / placeholder only.\
- **D** – Not implemented.

*The mapping reflects the current source code as of this handover and the results of the automated verification scripts.*
