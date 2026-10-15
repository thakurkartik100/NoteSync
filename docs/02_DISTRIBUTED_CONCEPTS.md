# Distributed Systems Concepts (FA-1 & FA-2)

## 1. Transparency & Middleware
NoteSync uses an **API Gateway (Port 5000)** as a middleware layer.
- **Location Transparency**: The client requests resources without knowing the exact IP address or port of individual department nodes.
- **Failure Transparency**: If Node IT goes down, the API Gateway returns resources from Node CE and Node E&TC while gracefully handling the offline state.

## 2. Remote Procedure Calls (RPC)
Department nodes implement `/rpc/execute` procedure handlers. The API Gateway dispatches synchronous procedure calls (`searchResources`, `getNodeStats`) over HTTP/JSON-RPC protocols, enabling remote execution as if it were a local function call.

## 3. Lamport Logical Clocks ($L = \max(L_{\text{local}}, L_{\text{msg}}) + 1$)
Physical clocks across independent servers drift. NoteSync uses Lamport logical clocks to order distributed events:
- **Local Event**: $L = L + 1$
- **Send Message**: Send timestamp $L_{\text{msg}} = L + 1$
- **Receive Message**: $L_{\text{new}} = \max(L_{\text{local}}, L_{\text{msg}}) + 1$

## 4. Bully Leader Election Algorithm
Nodes are assigned numerical IDs (Node 1 = CE, Node 2 = IT, Node 3 = E&TC).
- The node with the highest active ID assumes the role of **Coordinator / Leader**.
- If Node 3 crashes, lower nodes detect the failure and initiate an election. Node 2 emerges as the new leader.
- When Node 3 recovers, it broadcasts an election message and reclaims leadership ("bullies" lower nodes).

## 5. Heartbeat & Fault Tolerance
The API Gateway periodically sends a health check request (`GET /health`) every 3 seconds to all registered department nodes. Node state changes (ONLINE $\leftrightarrow$ OFFLINE) are broadcast in real-time to the frontend over WebSockets.
