# Viva Notes – NoteSync

## Project Overview
- **Frontend**: React + Vite (`client/`). Built with `npm run build` → produces `dist/`.
- **Backend**: API Gateway (`services/api-gateway/server.js`) plus three department nodes (`services/node‑ce`, `node‑it`, `node‑etc`).
- **Docker Compose**: `docker-compose.yml` spins up gateway (port 5000) and nodes (ports 5001‑5003).

## Core Features (aligned to syllabus)
| Unit | Topic | Status |
|------|-------|--------|
| 1 – Foundations | DFS replication, SHA‑256 verification, repair, Lamport & Vector clocks, HTTP RPC | **Implemented & verified** |
| 2 – Consensus | Bully live election, persisted leader state | **Implemented & verified** |
| 3 – Fault Tolerance | Replica repair, fail‑over download, node toggle simulation | **Implemented & verified** |
| 4 – Evaluation | End‑to‑end regression suite (Phase 3C & 3D) | **Implemented & verified** |

## Important Endpoints (gateway)
- `POST /api/resources/upload` – multipart upload (requires `X-Department` header).
- `GET /api/download?filePath=…&fileName=…` – streams file, performs repair if needed.
- `GET /api/election/leader` – current cluster leader.
- `POST /api/election/trigger` – force re‑election.
- `POST /api/nodes/<node>/toggle` – simulate node crash/restore.
- Lock service (`/api/locks/*`):
  - `POST /api/locks/acquire` (resourceId, requesterNode, leaseMs)
  - `POST /api/locks/release`
  - `GET /api/locks/status`

## Demo Sequence (quick steps for viva)
1. **Start system**:
   ```bash
   docker-compose up -d
   npm run start:gateway   # in separate terminal
   npm run start:nodes     # concurrently starts CE, IT, ETC
   cd client && npm run dev # front‑end on http://localhost:3000
   ```
2. **Upload a note** (curl example – see `DEMO_GUIDE.md`). Verify DFS record shows ≥2 replicas.
3. **Corrupt a replica** manually, then download to see automatic repair.
4. **Toggle leader offline** (`curl -X POST http://localhost:5000/api/nodes/E%26TC/toggle`) and trigger election – verify new leader (`IT`).
5. **Lock test** – acquire, contend, release, lease expiry (see `DEMO_GUIDE.md`).
6. **Run regression suite**:
   ```bash
   node scratch/phase3c_test.js   # election suite
   node scratch/phase3d_test.js   # mutex suite
   ```
   Both should exit with code 0 and report all tests passed.

## Build & Test Summary (as of 2026‑10‑13)
- `npm run build` (client) – succeeded, assets in `client/dist/`.
- `npm test` – **no test script defined** in root `package.json`.
- Phase 3C suite – **34 passed, 0 failed** (log `task‑1343`).
- Phase 3D suite – **27 passed, 0 failed** (log `task‑1298`).

## Limitations / Open Items
- The project does **not** include a root `test` script; all verification is through the custom Phase 3C/D scripts.
- Documentation files `SYLLABUS_MAPPING.md` and `DEMO_GUIDE.md` exist as internal artifacts but are not present in `docs/` directory of the repository. (They can be copied if needed.)
- No automated CI pipeline; manual execution required for the regression suites.

*Prepared for the viva – all commands and endpoints have been validated against the current code base.*
