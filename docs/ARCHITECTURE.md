# Architecture Overview

## Request Flow
1. **Frontend (React + Vite)** runs on `http://localhost:3000` and communicates with the **API Gateway** via REST endpoints and WebSocket events.
2. **API Gateway** (`services/api-gateway/server.js`, port **5000**) authenticates requests, resolves logical node URLs via the **Naming Service**, and forwards resource operations to the appropriate **department node**.
3. **Department Nodes** (`services/node-ce`, `services/node-it`, `services/node-etc`, ports **5001‑5003**) each host an isolated JSON‑based data partition (`data/ce_node_db.json`, `data/it_node_db.json`, `data/etc_node_db.json`).
   * Each node runs its own **DFS manager**, **Lamport clock**, **Vector clock**, and **Election Engine**.
4. **Replication**: When a resource is uploaded, the gateway stores the primary chunk on the target node and triggers replication to the other two nodes. SHA‑256 checksums verify physical integrity.
5. **Fault Tolerance**: The gateway polls `/health` on all nodes every 3 seconds. Offline nodes are marked, and a **Bully leader election** selects a new cluster coordinator among the remaining nodes.
6. **Mutual Exclusion**: A distributed lock service (`/api/locks/*`) uses the elected leader to coordinate lock acquisition, lease expiry, and release.

## Component Diagram (Mermaid)
```mermaid
flowchart LR
    subgraph Frontend[React + Vite (Port 3000)]
        UI[User Interface]
    end
    subgraph Gateway[API Gateway (Port 5000)]
        NS[Naming Service]
        HB[Heartbeat & Health Monitor]
        DFS[DFS Master]
        LE[Leader Election]
        LS[Lock Service]
    end
    subgraph CE[Node CE (Port 5001)]
        CE_DB[ce_node_db.json]
        CE_DFS[DFS Manager]
        CE_Clock[Lamport & Vector Clock]
        CE_Elec[Election Engine]
    end
    subgraph IT[Node IT (Port 5002)]
        IT_DB[it_node_db.json]
        IT_DFS[DFS Manager]
        IT_Clock[Lamport & Vector Clock]
        IT_Elec[Election Engine]
    end
    subgraph ETC[Node E&TC (Port 5003)]
        ETC_DB[etc_node_db.json]
        ETC_DFS[DFS Manager]
        ETC_Clock[Lamport & Vector Clock]
        ETC_Elec[Election Engine]
    end
    UI -->|REST / WS| Gateway
    Gateway -->|name resolution| NS
    Gateway -->|health checks| HB
    Gateway -->|replication| DFS
    Gateway -->|election msgs| LE
    Gateway -->|lock coordination| LS
    Gateway -->|forward ops| CE
    Gateway -->|forward ops| IT
    Gateway -->|forward ops| ETC
    CE --> CE_DB
    IT --> IT_DB
    ETC --> ETC_DB
    CE --> CE_DFS
    IT --> IT_DFS
    ETC --> ETC_DFS
    CE --> CE_Clock
    IT --> IT_Clock
    ETC --> ETC_Clock
    CE --> CE_Elec
    IT --> IT_Elec
    ETC --> ETC_Elec
```

## Key Distributed‑Systems Concepts
- **Location Transparency** – Clients use logical URIs (`node://ce`) without knowing host/port.
- **Naming Service** – Central directory maintained by the gateway.
- **Vector Clocks** – Causal ordering of note uploads across nodes.
- **Lamport Clocks** – Simple logical timestamps for event ordering.
- **Bully & Ring Elections** – Leader (cluster coordinator) selection; real‑time re‑election on node failure.
- **Distributed File System (DFS)** – Primary‑replica metadata, physical replication, SHA‑256 integrity verification.
- **Distributed Mutual Exclusion** – Centralised lock service using leases; dead‑lock prevention via lease expiry.
- **Heartbeat / Failure Detection** – Periodic health polls to detect offline nodes.
- **WebSocket Events** – Real‑time UI updates for node status, lock changes, and new resources.

*All components are implemented in this repository; the test suites (`test-syllabus.js`, `phase3b_test.js`, `phase3c_test.js`, `phase3d_test.js`) verify each feature end‑to‑end.*
