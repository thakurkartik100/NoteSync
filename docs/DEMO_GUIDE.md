# Demo Guide – NoteSync Distributed System

## Overview
This guide walks you through a **full end‑to‑end demonstration** of the NoteSync system, covering the core distributed‑systems features required for the final assessment.

| Feature | What you will see | Verification method |
|---------|--------------------|----------------------|
| Install all dependencies | `npm run install:all` installs server packages and the React client | No error output
| Start the whole stack | `npm run start:all` launches API gateway, three department nodes (CE, IT, E&TC) and the UI client | Console logs show each service listening on its port (Gateway 8080, Nodes 8081‑8083, Client 3000)
| Health check | `curl http://localhost:8080/health` and similar for each node | HTTP 200 response
| Upload a note | Use the UI **Upload** button or `POST /api/upload` (multipart/form‑data) | The file appears in the **DFS Catalog** view and a SHA‑256 checksum is stored.
| Replication & checksum verification | After upload, the note is stored on all three node storages (`services/node-*/data`). The UI shows **Replication ✔** and the backend logs display matching checksums. | Compare files on the three node folders or inspect the API response `replicated:true`.
| Fail‑over download | Stop one node (`Ctrl‑C` on its terminal) and download the same note via the UI **Download** button. | Download succeeds; backend reports the failed node and retrieves the file from a replica.
| Repair after failure | Restart the stopped node; the system automatically repairs the missing file (see log `repair initiated`). | The node’s storage now contains the repaired file.
| Lamport clock demonstration | After each operation, the response header `x-lamport-ts` increments monotonically across the whole system. | Observe increasing numbers in the Network tab of browser devtools.
| Vector‑clock conflict detection | Open two browser tabs, edit the same note concurrently, and click **Save** in both. The UI displays **Conflict Detected** when the vector clocks are concurrent. | The backend returns status `409 Conflict` with both vector clocks.
| Leader election (Bully) | Kill the current leader node (identified in the UI **Leader** badge). Within seconds a new leader is elected and the badge updates. | Log line `Election started` → `New leader: <node-id>`.
| Distributed lock (mutual exclusion) | Click **Acquire Lock** (UI button) – only one client can hold the lock at a time. | Subsequent attempts receive `423 Locked`.
| Snapshot demo (optional) | Click **Take Snapshot** – a snapshot JSON file is generated under `snapshots/`. | Verify the file contains the current DFS metadata.

## Step‑by‑step Commands
1. **Install everything**
   ```bash
   npm run install:all
   ```
2. **Start the entire system** (gateway, nodes, client) in one terminal
   ```bash
   npm run start:all
   ```
   *You can also start services individually using the scripts in `services/` if you prefer separate terminals.*
3. **Open the UI**
   - Navigate to <http://localhost:3000> in your browser.
4. **Upload a sample file**
   - Drag‑and‑drop any text file onto the **Upload** area.
   - Verify the *Replication* indicator turns green.
5. **Simulate a node failure**
   - In the terminal where a node (e.g., `node-ce`) is running, press `Ctrl‑C`.
   - In the UI, click **Download** for the same file – it should still download.
6. **Restart the failed node**
   - Run the same `npm run start:node‑ce` command in a new terminal.
   - Observe the *Repair* log entry and that the node’s `data/` folder now contains the file.
7. **Demonstrate clock ordering**
   - Perform several uploads or edits.
   - Open the browser devtools → Network → click a request → inspect the response header `x-lamport-ts`.
8. **Show vector‑clock concurrency**
   - Open two browser windows.
   - Edit the *same* note in both and click **Save** quickly.
   - One window will receive a `409 Conflict` and a message “Concurrent update detected”.
9. **Leader election**
   - Identify the leader node in the UI (badge shows **Leader**).
   - Stop that node’s process.
   - After ~5 seconds the badge switches to another node – the Bully algorithm elected a new leader.
10. **Acquire and release the distributed lock**
    - Click **Acquire Lock** – the button turns *Held*.
    - Open a second client; its **Acquire Lock** button stays disabled until the first releases via **Release Lock**.
11. **Optional snapshot**
    - Click **Take Snapshot** – a JSON file appears under `snapshots/`.
    - Open it to see a list of all stored notes with their vector‑clock vectors.

## Expected Outcomes
- All four nodes stay in sync – any upload instantly replicates.
- System tolerates a single‑node crash without data loss.
- Logical clocks (Lamport) increase monotonically; vector clocks correctly identify causality vs. concurrency.
- Bully election produces a single leader even after failures.
- Mutual exclusion ensures only one client holds the lock.
- No unhandled exceptions appear in the terminals; the test suite (`npm run test:api`) reports **SUCCESS** for all health checks.

---
**Tip:** Keep the terminal windows open while you demo; the logs provide live evidence of replication, repair, elections, and lock handling.
