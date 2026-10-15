import React, { useState } from 'react';
import { FileText, BookOpen, CheckCircle, HelpCircle, Server, Code } from 'lucide-react';

export default function DocsView() {
  const [selectedDoc, setSelectedDoc] = useState('overview');

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600" />
          Formative Assessment Documentation & Viva Prep
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Complete project documentation, distributed systems theory, architecture specifications, and viva Q&A guide.
        </p>
      </div>

      {/* Tab Selector */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'overview', label: '1. Project Overview', icon: BookOpen },
          { id: 'concepts', label: '2. DS Concepts (FA-1 & FA-2)', icon: Server },
          { id: 'viva', label: '3. Viva Questions & Answers', icon: HelpCircle }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = selectedDoc === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedDoc(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Document Content View */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm prose max-w-none text-slate-800 space-y-6 text-sm">
        
        {selectedDoc === 'overview' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">
              NoteSync: Distributed Student Notes Sharing System
            </h2>
            <p className="leading-relaxed text-slate-600">
              NoteSync is a distributed web-based academic resource sharing system built specifically for the 
              <strong> Formative Assessment (FA-1 & FA-2)</strong> in Distributed Systems. The core architectural design 
              replaces a monolithic single-server web app with <strong>independent department node servers</strong> (Node CE, Node IT, Node E&TC) managed via an <strong>API Gateway</strong>.
            </p>

            <h3 className="text-base font-bold text-slate-900">Key Objectives:</h3>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>Demonstrate independent node autonomy (each department maintains its own database file).</li>
              <li>Provide seamless API Gateway routing and transparent user experience.</li>
              <li>Perform periodic Heartbeat node health checks to detect node crashes live.</li>
              <li>Visualize inter-node communication, Lamport logical clocks, and Bully leader election.</li>
            </ul>

            <h3 className="text-base font-bold text-slate-900">System Ports Mapping:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              <div className="p-3 bg-slate-50 border rounded-lg font-mono text-xs">
                <span className="font-bold text-blue-600 block">API Gateway</span>
                <span>Port 5000</span>
              </div>
              <div className="p-3 bg-slate-50 border rounded-lg font-mono text-xs">
                <span className="font-bold text-emerald-600 block">Node CE</span>
                <span>Port 5001</span>
              </div>
              <div className="p-3 bg-slate-50 border rounded-lg font-mono text-xs">
                <span className="font-bold text-indigo-600 block">Node IT</span>
                <span>Port 5002</span>
              </div>
              <div className="p-3 bg-slate-50 border rounded-lg font-mono text-xs">
                <span className="font-bold text-purple-600 block">Node E&TC</span>
                <span>Port 5003</span>
              </div>
            </div>
          </div>
        )}

        {selectedDoc === 'concepts' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">
              Distributed Systems Concepts Implemented (FA-1 & FA-2)
            </h2>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-bold text-blue-700 text-sm">1. Multi-Node Autonomous Architecture & Transparency</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Users query a single API Gateway (`http://localhost:5000`). The gateway transparently routes requests to `ce_node`, `it_node`, or `etc_node` without exposing underlying node network addresses to the user.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-bold text-indigo-700 text-sm">2. Remote Procedure Call (RPC)</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Department nodes expose `/rpc/execute` procedure handlers. Gateway dispatches synchronous procedure execution requests (e.g. `searchResources`, `getNodeStats`) across network sockets.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-bold text-purple-700 text-sm">3. Lamport Logical Clock (L = max(L, L_msg) + 1)</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Events across distributed nodes are timestamped using Lamport clocks. On receiving an inter-node message with timestamp L_msg, the receiver node updates its local clock to L_new = max(L_local, L_msg) + 1.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-bold text-emerald-700 text-sm">4. Bully Leader Election Algorithm</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Nodes have assigned numerical IDs (1, 2, 3). If Node 3 (highest ID) crashes, lower nodes hold an election to designate Node 2 as the new coordinator. When Node 3 recovers, it re-claims leadership.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-bold text-red-700 text-sm">5. Heartbeat & Fault Tolerance</h4>
                <p className="text-xs text-slate-600 mt-1">
                  API Gateway polls `/health` on all department nodes every 3 seconds. If a node drops offline, the system degrades gracefully, serving resources from active nodes while displaying offline warning badges.
                </p>
              </div>
            </div>
          </div>
        )}

        {selectedDoc === 'viva' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">
              Curated Viva Questions & Answers
            </h2>

            <div className="space-y-4">
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                <p className="font-bold text-slate-900 text-sm">Q1: How does NoteSync prove it is a Distributed System and not just a single monolithic website?</p>
                <p className="text-xs text-slate-600 mt-1">
                  <strong>Answer:</strong> NoteSync runs 4 distinct server processes (Ports 5000, 5001, 5002, 5003). Each department node maintains its own independent database file (`ce_node_db.json`, `it_node_db.json`, `etc_node_db.json`). If Node IT is shut down, Node CE and Node E&TC continue operating independently.
                </p>
              </div>

              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                <p className="font-bold text-slate-900 text-sm">Q2: How are Lamport Logical Clocks synchronized in NoteSync?</p>
                <p className="text-xs text-slate-600 mt-1">
                  <strong>Answer:</strong> Every inter-node message includes the sender's clock timestamp L_msg. When the receiver receives the message, it applies Lamport's algorithm: L_new = max(L_local, L_msg) + 1.
                </p>
              </div>

              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                <p className="font-bold text-slate-900 text-sm">Q3: What happens when a department node crashes?</p>
                <p className="text-xs text-slate-600 mt-1">
                  <strong>Answer:</strong> The API Gateway heartbeat monitor detects the non-responsive HTTP endpoint within 3 seconds and marks the node OFFLINE. Requests for other departments continue executing without interruption.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
