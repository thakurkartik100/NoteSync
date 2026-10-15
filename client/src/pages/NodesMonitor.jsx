import React, { useState, useEffect } from 'react';
import { Cpu, Server, Activity, RefreshCw, CheckCircle, AlertTriangle, Database, Terminal, Zap } from 'lucide-react';

export default function NodesMonitor({ nodeStatus, onToggleNode }) {
  const [nodeLogs, setNodeLogs] = useState({ CE: [], IT: [], 'E&TC': [] });
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    const logsObj = { CE: [], IT: [], 'E&TC': [] };

    for (const key of ['CE', 'IT', 'E&TC']) {
      try {
        const resp = await fetch(`/api/nodes/${encodeURIComponent(key)}/logs`);
        if (resp.ok) {
          const text = await resp.text();
          const data = text ? JSON.parse(text) : {};
          logsObj[key] = data.logs || [];
        }
      } catch (err) {
        logsObj[key] = [];
      }
    }
    setNodeLogs(logsObj);
    setLoadingLogs(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Cpu className="w-6 h-6 text-blue-600" />
            Distributed Department Nodes Monitor
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time status, database storage partitions, and heartbeat health checks for all independent node servers.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="btn btn-secondary text-xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
          Refresh Logs
        </button>
      </div>

      {/* Node Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { key: 'CE', name: 'Node CE (Computer Engg)', port: 5001, dbFile: 'ce_node_db.json' },
          { key: 'IT', name: 'Node IT (Information Tech)', port: 5002, dbFile: 'it_node_db.json' },
          { key: 'E&TC', name: 'Node E&TC (Electronics & Telecom)', port: 5003, dbFile: 'etc_node_db.json' }
        ].map(node => {
          const statusObj = nodeStatus[node.key] || {};
          const isOnline = statusObj.status === 'ONLINE';
          const details = statusObj.details || {};

          return (
            <div key={node.key} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-5">
              
              <div>
                {/* Node Title & Status Badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-base text-slate-900">{node.name}</span>
                  <span className={`badge ${isOnline ? 'badge-online' : 'badge-offline'}`}>
                    <span className={`pulse-dot ${isOnline ? 'online' : 'offline'}`}></span>
                    {isOnline ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4">
                  <p>• Service Port: <strong className="text-slate-900">{node.port}</strong></p>
                  <p>• Autonomous DB: <strong className="text-slate-900">{node.dbFile}</strong></p>
                  <p>• Department Tag: <strong className="text-blue-600">{node.key}</strong></p>
                  <p>• Lamport Clock ($L$): <strong className="text-indigo-600">{details.clock || 0}</strong></p>
                  <p>• Resources Stored: <strong className="text-emerald-600">{details.resourceCount || 0} items</strong></p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  {isOnline ? 'Healthy Heartbeat' : 'Simulated Crash State'}
                </span>
                <button
                  onClick={() => onToggleNode(node.key)}
                  className={`btn text-xs py-1.5 px-3 ${
                    isOnline ? 'btn-danger' : 'btn-success'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  {isOnline ? 'Crash Node' : 'Recover Node'}
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Internal Node Execution Logs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
          <Terminal className="w-5 h-5 text-slate-700" />
          Autonomous Node Internal Audit Logs
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Each department node records its own event history independently.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {['CE', 'IT', 'E&TC'].map(key => (
            <div key={key} className="bg-slate-900 text-slate-200 rounded-xl p-4 font-mono text-xs overflow-hidden">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3 text-slate-400 font-bold">
                <span>Logs: Node {key}</span>
                <span className="text-[10px] text-blue-400">{nodeLogs[key]?.length || 0} entries</span>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {(nodeLogs[key] || []).length === 0 ? (
                  <p className="text-slate-500 italic text-[11px]">No log entries recorded yet.</p>
                ) : (
                  nodeLogs[key].map((log, idx) => (
                    <div key={idx} className="border-b border-slate-800/60 pb-1.5 text-[11px]">
                      <div className="flex items-center justify-between text-blue-300">
                        <span>[{log.event || 'EVENT'}]</span>
                        <span className="text-indigo-400 font-semibold">L={log.clock || 0}</span>
                      </div>
                      <p className="text-slate-300 mt-0.5">{log.details || log.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
