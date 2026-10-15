import React, { useState } from 'react';
import { Activity, Zap, Clock, ShieldCheck, Cpu, ArrowRight, Play, RefreshCw, Server, Send, AlertTriangle, Layers } from 'lucide-react';

export default function DSDemoConsole({ nodeStatus }) {
  const [activeTab, setActiveTab] = useState('lamport');

  // Lamport Clock Simulation State
  const [clocks, setClocks] = useState({ NodeCE: 1, NodeIT: 1, NodeETC: 1 });
  const [lamportLogs, setLamportLogs] = useState([
    { id: 1, event: 'System Bootstrapped', clocks: { NodeCE: 1, NodeIT: 1, NodeETC: 1 }, timestamp: new Date().toLocaleTimeString() }
  ]);

  // Bully Election Simulation State
  const [leader, setLeader] = useState('Node 3 (Port 5003)');
  const [electionLogs, setElectionLogs] = useState([
    { time: new Date().toLocaleTimeString(), text: 'Node 3 is currently active Coordinator / Leader' }
  ]);
  const [electionNodes, setElectionNodes] = useState({
    1: { name: 'Node 1 (CE)', id: 1, active: true },
    2: { name: 'Node 2 (IT)', id: 2, active: true },
    3: { name: 'Node 3 (E&TC)', id: 3, active: true }
  });

  // RPC Live Trace State
  const [rpcTrace, setRpcTrace] = useState(null);
  const [rpcLoading, setRpcLoading] = useState(false);

  // Mutual Exclusion State
  const [csState, setCsState] = useState({ holder: 'NONE', queue: [] });
  const [mutexLogs, setMutexLogs] = useState([
    { text: 'Critical Section is currently FREE' }
  ]);

  // 1. Lamport Clock Handlers
  const handleLocalEvent = (nodeKey) => {
    setClocks(prev => {
      const nextClock = prev[nodeKey] + 1;
      const updated = { ...prev, [nodeKey]: nextClock };
      setLamportLogs(logs => [
        {
          id: Date.now(),
          event: `Local event executed on ${nodeKey} (Clock ++1)`,
          clocks: updated,
          timestamp: new Date().toLocaleTimeString()
        },
        ...logs
      ]);
      return updated;
    });
  };

  const handleSendMessage = (sender, receiver) => {
    setClocks(prev => {
      const senderClock = prev[sender] + 1;
      const receiverClock = Math.max(prev[receiver], senderClock) + 1;
      const updated = { ...prev, [sender]: senderClock, [receiver]: receiverClock };

      setLamportLogs(logs => [
        {
          id: Date.now(),
          event: `Message sent from ${sender} (L=${senderClock}) → Received by ${receiver} (Updated L=max(${prev[receiver]}, ${senderClock})+1 = ${receiverClock})`,
          clocks: updated,
          timestamp: new Date().toLocaleTimeString()
        },
        ...logs
      ]);
      return updated;
    });
  };

  // 2. Bully Election Handlers
  const handleCrashLeader = () => {
    setElectionNodes(prev => ({
      ...prev,
      3: { ...prev[3], active: false }
    }));
    setLeader('ELECTION IN PROGRESS...');
    setElectionLogs(prev => [
      { time: new Date().toLocaleTimeString(), text: 'Node 3 CRASHED! Leader Failure detected by Node 1 & Node 2.' },
      { time: new Date().toLocaleTimeString(), text: 'Node 1 sends ELECTION message to higher ID Node 2.' },
      { time: new Date().toLocaleTimeString(), text: 'Node 2 responds OK to Node 1, starting election for highest ID.' },
      { time: new Date().toLocaleTimeString(), text: 'Node 2 has highest active ID (ID 2). Node 2 proclaims itself COORDINATOR.' },
      ...prev
    ]);
    setTimeout(() => {
      setLeader('Node 2 (Port 5002)');
    }, 1500);
  };

  const handleRecoverLeader = () => {
    setElectionNodes(prev => ({
      ...prev,
      3: { ...prev[3], active: true }
    }));
    setElectionLogs(prev => [
      { time: new Date().toLocaleTimeString(), text: 'Node 3 RECOVERED! Higher ID node back online.' },
      { time: new Date().toLocaleTimeString(), text: 'Node 3 broadcasts ELECTION message to all lower nodes.' },
      { time: new Date().toLocaleTimeString(), text: 'Node 3 has highest ID (ID 3). Node 3 re-claims COORDINATOR role.' },
      ...prev
    ]);
    setLeader('Node 3 (Port 5003)');
  };

  // 3. RPC Trigger Handler
  const handleTriggerRpc = async (targetDept) => {
    setRpcLoading(true);
    try {
      const resp = await fetch('/api/demo/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetDept,
          procedure: 'getNodeStats',
          senderClock: clocks[`Node${targetDept.replace('&', '')}`] || 1
        })
      });
      const data = await resp.json();
      setRpcTrace(data);
    } catch (err) {
      setRpcTrace({ error: err.message });
    } finally {
      setRpcLoading(false);
    }
  };

  // 4. Mutual Exclusion Handler
  const handleRequestCS = (nodeName) => {
    if (csState.holder === 'NONE') {
      setCsState({ holder: nodeName, queue: [] });
      setMutexLogs(prev => [{ text: `${nodeName} requested Critical Section $\\rightarrow$ GRANTED immediately.` }, ...prev]);
    } else if (csState.holder === nodeName) {
      setMutexLogs(prev => [{ text: `${nodeName} already holds the Critical Section.` }, ...prev]);
    } else {
      if (!csState.queue.includes(nodeName)) {
        setCsState(prev => ({ ...prev, queue: [...prev.queue, nodeName] }));
        setMutexLogs(prev => [{ text: `${nodeName} requested CS $\\rightarrow$ Queued behind ${csState.holder}` }, ...prev]);
      }
    }
  };

  const handleReleaseCS = () => {
    if (csState.holder === 'NONE') return;

    const currentHolder = csState.holder;
    if (csState.queue.length > 0) {
      const nextHolder = csState.queue[0];
      const remainingQueue = csState.queue.slice(1);
      setCsState({ holder: nextHolder, queue: remainingQueue });
      setMutexLogs(prev => [
        { text: `${currentHolder} released CS $\\rightarrow$ Granted to next queued node: ${nextHolder}` },
        ...prev
      ]);
    } else {
      setCsState({ holder: 'NONE', queue: [] });
      setMutexLogs(prev => [{ text: `${currentHolder} released CS $\\rightarrow$ Critical Section is now FREE.` }, ...prev]);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200 mb-2">
            <Activity className="w-3.5 h-3.5" />
            <span>Interactive Formative Assessment Demo Console</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Distributed Systems Concept Visualizer
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Live interactive demonstrations of Unit 1 & Unit 2 DS concepts for college viva examination.
          </p>
        </div>
      </div>

      {/* Tab Selector Buttons */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'lamport', label: '1. Lamport Clock', icon: Clock },
          { id: 'bully', label: '2. Leader Election (Bully)', icon: ShieldCheck },
          { id: 'rpc', label: '3. RPC Execution', icon: Zap },
          { id: 'mutex', label: '4. Mutual Exclusion', icon: Layers }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: LAMPORT LOGICAL CLOCK */}
      {activeTab === 'lamport' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Lamport Logical Clock Simulation (L = max(L_local, L_msg) + 1)
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Simulates total order event ordering across independent department nodes without synchronized physical clocks.
            </p>

            {/* Nodes Clocks Display */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
              {[
                { name: 'Node CE', key: 'NodeCE', color: 'blue' },
                { name: 'Node IT', key: 'NodeIT', color: 'indigo' },
                { name: 'Node E&TC', key: 'NodeETC', color: 'emerald' }
              ].map(node => (
                <div key={node.key} className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
                  <span className="text-xs font-bold uppercase text-slate-500">{node.name}</span>
                  <div className="text-4xl font-extrabold text-blue-600 font-mono my-2">
                    L = {clocks[node.key]}
                  </div>
                  <div className="flex flex-col gap-2 mt-4">
                    <button
                      onClick={() => handleLocalEvent(node.key)}
                      className="btn btn-secondary text-xs py-1"
                    >
                      Trigger Local Event (++1)
                    </button>
                    {node.key !== 'NodeIT' && (
                      <button
                        onClick={() => handleSendMessage(node.key, 'NodeIT')}
                        className="btn btn-primary text-xs py-1"
                      >
                        Send Msg $\rightarrow$ Node IT
                      </button>
                    )}
                    {node.key === 'NodeIT' && (
                      <button
                        onClick={() => handleSendMessage('NodeIT', 'NodeCE')}
                        className="btn btn-primary text-xs py-1"
                      >
                        Send Msg $\rightarrow$ Node CE
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Event Timeline */}
            <div className="bg-slate-900 text-slate-200 rounded-xl p-4 font-mono text-xs">
              <span className="text-slate-400 font-bold block mb-3 border-b border-slate-800 pb-2">
                Lamport Event Timeline
              </span>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {lamportLogs.map(log => (
                  <div key={log.id} className="flex items-center justify-between text-slate-300 border-b border-slate-800/60 pb-1">
                    <span>{log.event}</span>
                    <span className="text-blue-400 text-[11px]">{log.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BULLY LEADER ELECTION */}
      {activeTab === 'bully' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Bully Leader Election Algorithm Simulation
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              When the active coordinator (highest process ID) fails, lower-ID nodes initiate an election to designate a new leader.
            </p>

            {/* Leader Banner */}
            <div className="bg-indigo-50 border border-indigo-200 p-5 rounded-xl flex items-center justify-between mb-6">
              <div>
                <span className="text-xs font-bold uppercase text-indigo-600">Current Coordinator / Leader</span>
                <p className="text-2xl font-extrabold text-indigo-950 mt-1">{leader}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCrashLeader}
                  disabled={!electionNodes[3].active}
                  className="btn btn-danger text-xs"
                >
                  Simulate Node 3 Crash
                </button>
                <button
                  onClick={handleRecoverLeader}
                  disabled={electionNodes[3].active}
                  className="btn btn-success text-xs"
                >
                  Recover Node 3
                </button>
              </div>
            </div>

            {/* Nodes ID Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
              {[1, 2, 3].map(id => {
                const node = electionNodes[id];
                const isLeader = leader.includes(`Node ${id}`);
                return (
                  <div 
                    key={id} 
                    className={`p-4 rounded-xl border ${
                      !node.active 
                        ? 'bg-red-50 border-red-200' 
                        : isLeader 
                          ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20' 
                          : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-slate-900">{node.name}</span>
                      <span className="font-mono text-xs font-bold text-slate-500">Process ID = {id}</span>
                    </div>
                    <p className={`text-xs font-bold ${
                      !node.active ? 'text-red-600' : isLeader ? 'text-indigo-700' : 'text-slate-600'
                    }`}>
                      {!node.active ? 'CRASHED / OFFLINE' : isLeader ? 'COORDINATOR LEADER' : 'FOLLOWER'}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Election Event Log */}
            <div className="bg-slate-900 text-slate-200 rounded-xl p-4 font-mono text-xs">
              <span className="text-slate-400 font-bold block mb-3 border-b border-slate-800 pb-2">
                Bully Election Trace Log
              </span>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {electionLogs.map((log, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-slate-300 border-b border-slate-800/60 pb-1">
                    <span className="text-indigo-400 text-[11px]">{log.time}</span>
                    <span>{log.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REMOTE PROCEDURE CALL (RPC) */}
      {activeTab === 'rpc' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Remote Procedure Call (RPC) Live Execution
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Simulates client executing procedures remotely on isolated department node services over HTTP/JSON-RPC.
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-6">
              <button
                onClick={() => handleTriggerRpc('CE')}
                disabled={rpcLoading}
                className="btn btn-primary text-xs"
              >
                Execute RPC on Node CE (Port 5001)
              </button>

              <button
                onClick={() => handleTriggerRpc('IT')}
                disabled={rpcLoading}
                className="btn btn-primary text-xs"
              >
                Execute RPC on Node IT (Port 5002)
              </button>

              <button
                onClick={() => handleTriggerRpc('E&TC')}
                disabled={rpcLoading}
                className="btn btn-primary text-xs"
              >
                Execute RPC on Node E&TC (Port 5003)
              </button>
            </div>

            {rpcTrace && (
              <div className="bg-slate-900 text-slate-200 rounded-xl p-5 font-mono text-xs overflow-x-auto space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-emerald-400 font-bold">
                  <span>RPC Execution Response Payload</span>
                  <span>Latency: {rpcTrace.roundTripTimeMs} ms</span>
                </div>
                <pre className="text-slate-300 text-[11px] leading-relaxed">
                  {JSON.stringify(rpcTrace, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: MUTUAL EXCLUSION */}
      {activeTab === 'mutex' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Distributed Mutual Exclusion Simulation
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Ensures only one department node accesses shared resource lock at a time, queueing contending requests.
            </p>

            {/* CS Status Card */}
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <span className="text-xs font-bold uppercase text-slate-500">Critical Section Lock Holder</span>
                <p className="text-2xl font-extrabold text-blue-600 font-mono mt-1">{csState.holder}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Queue Waiting: {csState.queue.length === 0 ? 'Empty' : csState.queue.join(', ')}
                </p>
              </div>
              <button
                onClick={handleReleaseCS}
                disabled={csState.holder === 'NONE'}
                className="btn btn-danger text-xs"
              >
                Release Lock / Critical Section
              </button>
            </div>

            {/* Request Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {['Node CE', 'Node IT', 'Node E&TC'].map(name => (
                <button
                  key={name}
                  onClick={() => handleRequestCS(name)}
                  className="btn btn-secondary text-xs py-2"
                >
                  Request Lock from {name}
                </button>
              ))}
            </div>

            {/* Mutex Event Log */}
            <div className="bg-slate-900 text-slate-200 rounded-xl p-4 font-mono text-xs">
              <span className="text-slate-400 font-bold block mb-3 border-b border-slate-800 pb-2">
                Mutual Exclusion Lock Audit Log
              </span>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {mutexLogs.map((log, idx) => (
                  <div key={idx} className="text-slate-300 border-b border-slate-800/60 pb-1">
                    {log.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
