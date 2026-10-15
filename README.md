# NoteSync – Multi-Node Distributed Academic Notes Sharing Network

[![System Status](https://img.shields.io/badge/System-Active-emerald.svg)](#)
[![Architecture](https://img.shields.io/badge/Architecture-Distributed%20Microservices-blue.svg)](#)
[![Docker](https://img.shields.io/badge/Containerized-Docker--Compose-cyan.svg)](#)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20v22-green.svg)](#)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-indigo.svg)](#)

---

## 📌 Executive Summary

**NoteSync** is an enterprise-grade, decentralized academic resource sharing platform built to replace traditional monolithic single-server university portals. 

Instead of hosting data on a single central server subject to single-point-of-failure risks, NoteSync partitions data storage and request processing across **autonomous department node microservices** (**Computer Engineering**, **Information Technology**, and **Electronics & Telecommunication**), managed transparently via an **API Gateway** with real-time **WebSocket event broadcasting**.

---

## 🌟 Key Architecture & System Capabilities

- 🧩 **Autonomous Department Microservices**: Each department operates its own standalone Express server with an isolated, partition-backed JSON database store (`ce_node_db.json`, `it_node_db.json`, `etc_node_db.json`).
- 🌐 **Location Transparency & Dynamic Naming Service**: Resolves logical resource URIs (`node://ce`, `node://it`, `node://etc`) to physical IP host addresses and port numbers without exposing server infrastructure to the client.
- ⏱️ **Vector Clock Synchronization**: Tracks event causality ($V = [CE, IT, E\&TC, GATEWAY]$) to distinguish between concurrent and causally dependent note uploads without relying on synchronized system hardware clocks.
- 🛡️ **Mini Distributed File System (DFS) & Replication**: Master metadata catalog managing primary chunk placement on target department nodes and automatic secondary chunk replication on backup nodes.
- 🚨 **Fault Tolerance & Heartbeat Polling**: Gateway polls `/health` on all department nodes every 3 seconds to handle partial server failures seamlessly without crashing the web UI.
- 👑 **Leader Election Algorithms**: Integrated implementations of both the **Bully Election Algorithm** and **Ring Election Algorithm** for coordinator selection during node failures.

---

## 🏗️ System Architecture Flowchart

```
┌────────────────────────────────────────────────────────────────────────┐
│                      Frontend Client (React 18 + Vite)                 │
│                        Port 3000 / Light UI Theme                      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP REST / Persistent WebSockets
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       API Gateway & Router                             │
│                              Port 5000                                 │
│  • Location Transparency          • Dynamic Naming Service             │
│  • Heartbeat Health Poller        • Mini-DFS Master Namespace          │
└───────────────┬───────────────────┼────────────────────┬───────────────┘
                │                   │                    │
                ▼                   ▼                    ▼
     ┌──────────────────┐┌──────────────────┐┌──────────────────┐
     │     Node CE      ││     Node IT      ││    Node E&TC     │
     │    Port 5001     ││    Port 5002     ││    Port 5003     │
     │  (Process ID 1)  ││  (Process ID 2)  ││  (Process ID 3)  │
     │  ce_node_db.json ││  it_node_db.json ││ etc_node_db.json │
     └──────────────────┘└──────────────────┘└──────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technology Used |
| :--- | :--- |
| **Frontend UI** | React 18, Vite, Tailwind CSS, Lucide React Icons |
| **API Gateway** | Node.js, Express.js, WebSocket Server (`ws://`) |
| **Microservice Nodes** | Node.js Express (Ports 5001, 5002, 5003) |
| **Storage & Database** | Isolated Partition JSON File Databases (`/data/`) |
| **Protocols & RPC** | JSON-RPC over TCP/HTTP, WebSockets, HTTP REST |
| **Virtualization** | Docker, Docker Compose (5 Microservices) |

---

## 🔌 API Gateway & Microservice Port Mapping

| Service Name | Container / Host Port | Purpose |
| :--- | :--- | :--- |
| **`notesync-client`** | `3000:3000` | React Web Portal Frontend |
| **`notesync-api-gateway`** | `5000:5000` | Gateway Proxy Router & WebSocket Server |
| **`notesync-node-ce`** | `5001:5001` | Computer Engineering Department Server |
| **`notesync-node-it`** | `5002:5002` | Information Technology Department Server |
| **`notesync-node-etc`** | `5003:5003` | Electronics & Telecom Department Server |

---

## 🚀 Setup & Step-by-Step Execution Guide

### 📦 Option A: Running from a Downloaded ZIP File

If you downloaded `NoteSync-main.zip` from GitHub:

#### Step 1: Extract the ZIP Archive
Extract `NoteSync-main.zip` to a directory of your choice (e.g. `D:\NoteSync`).

#### Step 2: Open Terminal / Command Prompt / PowerShell
Navigate into the extracted project directory:
```bash
cd D:\NoteSync
```

#### Step 3: Run the Application (Node.js or Docker)

**Using Node.js (Quickest - 2 Commands)**:
```bash
# 1. Install all root and client dependencies with 1 command
npm run install:all

# 2. Start all microservices & React web UI concurrently
npm run start:all
```

**Using Docker Desktop**:
```bash
# Build & start all 5 containers
docker compose up --build -d
```

---

### 🐳 Option B: Running via Docker Compose (Recommended for Production)
*Prerequisite: [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.*

```bash
# Clone repository
git clone https://github.com/RohanAdkine/NoteSync.git
cd NoteSync

# Launch multi-container stack
docker compose up --build -d
```

---

### 💻 Option C: Native Node.js Execution
*Prerequisite: [Node.js](https://nodejs.org/) (v18 or higher).*

```bash
# Clone repository
git clone https://github.com/RohanAdkine/NoteSync.git
cd NoteSync

# Install all dependencies and start all services
npm run install:all
npm run start:all
```

---

## 🌐 Opening the Application

After running any setup option above, open your web browser and visit:

- 🎨 **Web Portal UI**: **`http://localhost:3000`**
- ⚙️ **API Gateway**: **`http://localhost:5000`**

---

## 🎓 Demonstration Guide for Presentations & Viva

1. **Demonstrate Node Autonomy**: Open `D:\NoteSync\data\` directory to inspect the 3 separate database partition files (`ce_node_db.json`, `it_node_db.json`, `etc_node_db.json`).
2. **Demonstrate Resource Upload**: Upload an academic note on the UI and show how it gets dispatched to the target department storage with backup replication metadata.
3. **Demonstrate Fault Tolerance**: On the UI Dashboard, click **"Set Offline"** on Node IT. Show that Node IT switches to red `OFFLINE`, while Node CE and Node E&TC remain fully functional.
4. **Demonstrate Vector Clocks**: View the **Department Nodes** monitor to inspect live vector clock history ($V = [CE, IT, E\&TC, GATEWAY]$).
5. **Demonstrate PDF Downloads & Deletion**: Download notes with guaranteed `.pdf` formatting and delete resources with live WebSocket UI synchronization.

---

