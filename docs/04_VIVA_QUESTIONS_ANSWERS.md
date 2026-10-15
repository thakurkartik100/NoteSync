# Distributed Systems Viva Questions & Answers

### Q1: What makes NoteSync a true Distributed System?
**Answer:** NoteSync consists of 4 separate server processes running on different ports (5000, 5001, 5002, 5003). Each node maintains its own autonomous database storage partition (`ce_node_db.json`, `it_node_db.json`, `etc_node_db.json`). They communicate asynchronously over network sockets and handle node failures independently.

### Q2: What is the role of the API Gateway?
**Answer:** The API Gateway acts as the Middleware layer providing single-point entry, request proxying, heartbeat health monitoring, WebSocket broadcasting, and location transparency to the client.

### Q3: How does the Lamport Logical Clock work in NoteSync?
**Answer:** Lamport logical clocks assign a monotonically increasing integer timestamp $L$ to every event. When Node A sends a message to Node B with clock $L_A$, Node B updates its clock using:
$$L_B = \max(L_B, L_A) + 1$$
This guarantees partial ordering of distributed events.

### Q4: Explain the Bully Algorithm demonstration.
**Answer:** Each department node has a process ID: Node 1 (CE), Node 2 (IT), Node 3 (E&TC). Node 3 starts as leader. If Node 3 crashes, lower nodes hold an election. Node 2 has the highest active ID, so it becomes coordinator. When Node 3 recovers, it re-claims leadership.

### Q5: How is fault tolerance demonstrated?
**Answer:** Examiners can click "Crash Node" on any department server. The API Gateway detects the crash via heartbeat within 3 seconds and updates the UI status badge to OFFLINE. The rest of the system remains 100% operational.
