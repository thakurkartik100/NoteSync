# Project Overview - NoteSync

## Problem Statement
In traditional academic institutions, study resources (lecture notes, question papers, lab manuals) are hosted on centralized monolithic servers. If the server fails or experiences network congestion, all departments lose access simultaneously. Furthermore, centralized systems do not reflect the physical autonomy of distinct academic departments (Computer Engineering, Information Technology, Electronics & Telecommunication).

## Objective
**NoteSync** is a distributed academic resource-sharing platform designed to solve these limitations. It demonstrates **Distributed Systems concepts** required for Formative Assessment (FA-1 & FA-2):
- Autonomous department nodes serving local resources.
- Central API Gateway providing routing, node health monitoring, and transparent access.
- Inter-node message passing and Lamport logical clocks for event ordering.
- Bully election algorithm for leader coordinator selection.
- Node failure recovery and degraded service fault tolerance.

## Architecture

```
                          ┌──────────────────────────┐
                          │   React Frontend (UI)    │
                          │   (Port 3000 / Vite)     │
                          └────────────┬─────────────┘
                                       │ HTTP / WebSockets
                                       ▼
                          ┌──────────────────────────┐
                          │   API Gateway / Router   │
                          │   (Port 5000 / Express)  │
                          └────┬──────────┬──────────┘
                               │          │
         ┌─────────────────────┼──────────┴─────────────────────┐
         │ RPC / REST          │ RPC / REST                     │ RPC / REST
         ▼                     ▼                                ▼
┌──────────────────┐  ┌──────────────────┐            ┌──────────────────┐
│   Node CE        │  │   Node IT        │            │   Node E&TC      │
│ (CE Department)  │  │ (IT Department)  │            │ (E&TC Department)│
│  Port 5001       │  │  Port 5002       │            │  Port 5003       │
│  ce_node_db.json │  │  it_node_db.json │  │  etc_node_db.json│
└──────────────────┘  └──────────────────┘            └──────────────────┘
```
