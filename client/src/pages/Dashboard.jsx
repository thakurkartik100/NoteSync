import React, { useState } from 'react';
import { BookOpen, Server, Search, Upload, ArrowRight, FileText, RefreshCw, Database, Download } from 'lucide-react';

export default function Dashboard({ resources, nodeStatus, setActivePage, onSearch, onToggleNode, loading }) {
  const [searchTerm, setSearchTerm] = useState('');

  const totalResources = resources.length;
  const ceCount = resources.filter(r => r.department === 'CE').length;
  const itCount = resources.filter(r => r.department === 'IT').length;
  const etcCount = resources.filter(r => r.department === 'E&TC' || r.department === 'ETC').length;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    onSearch(searchTerm);
    setActivePage('resources');
  };

  return (
    <div className="space-y-8">

      {/* Hero Welcome Banner */}
      <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-8 sm:p-10 text-white shadow-xl shadow-blue-900/10 overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute right-1/3 -top-20 w-60 h-60 bg-indigo-400/20 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-blue-100 text-xs font-semibold backdrop-blur-md mb-4 border border-white/20">
            <span>Academic Notes Sharing Network</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
            NoteSync: Distributed Notes Sharing System
          </h1>

          <p className="text-blue-100 text-sm sm:text-base mb-8 leading-relaxed font-normal opacity-95">
            A seamless academic resource platform serving notes, previous question papers, lab manuals, and study materials across Computer Engineering, IT, and E&TC department nodes.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActivePage('resources')}
              className="px-6 py-3 bg-white text-blue-700 font-bold rounded-xl shadow-lg hover:bg-blue-50 transition-all transform hover:-translate-y-0.5 flex items-center gap-2 text-sm"
            >
              <BookOpen className="w-4 h-4 text-blue-600" />
              Browse Notes Repository
            </button>

            <button
              onClick={() => setActivePage('upload')}
              className="px-6 py-3 bg-white/15 backdrop-blur-md text-white font-bold rounded-xl hover:bg-white/25 transition-all border border-white/30 flex items-center gap-2 text-sm"
            >
              <Upload className="w-4 h-4 text-white" />
              Upload Academic File
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm card-hover flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold tracking-wider text-slate-400 uppercase">Total Resources</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-extrabold text-slate-900">{totalResources}</p>
            <p className="text-xs font-medium text-slate-500 mt-1">Aggregated across all nodes</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm card-hover flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold tracking-wider text-slate-400 uppercase">Node CE (Port 5001)</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
              nodeStatus.CE?.status === 'ONLINE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {nodeStatus.CE?.status || 'UNKNOWN'}
            </span>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-extrabold text-slate-900">{ceCount}</p>
            <p className="text-xs font-medium text-slate-500 mt-1">Computer Engg Notes</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm card-hover flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold tracking-wider text-slate-400 uppercase">Node IT (Port 5002)</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
              nodeStatus.IT?.status === 'ONLINE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {nodeStatus.IT?.status || 'UNKNOWN'}
            </span>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-extrabold text-slate-900">{itCount}</p>
            <p className="text-xs font-medium text-slate-500 mt-1">Information Tech Notes</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm card-hover flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold tracking-wider text-slate-400 uppercase">Node E&TC (Port 5003)</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
              nodeStatus['E&TC']?.status === 'ONLINE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {nodeStatus['E&TC']?.status || 'UNKNOWN'}
            </span>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-extrabold text-slate-900">{etcCount}</p>
            <p className="text-xs font-medium text-slate-500 mt-1">Electronics & Telecom Notes</p>
          </div>
        </div>

      </div>

      {/* Autonomous Department Nodes Overview */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Server className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Department Network Status
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Live statuses and availability across all independent department server nodes.
            </p>
          </div>

          <button
            onClick={() => setActivePage('nodes')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 self-start sm:self-auto hover:underline"
          >
            <span>Detailed Node Monitor</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { dept: 'CE', label: 'Node CE (Computer Engg)', port: 5001, db: 'ce_node_db.json' },
            { dept: 'IT', label: 'Node IT (Information Tech)', port: 5002, db: 'it_node_db.json' },
            { dept: 'E&TC', label: 'Node E&TC (Electronics & Telecom)', port: 5003, db: 'etc_node_db.json' }
          ].map(item => {
            const statusObj = nodeStatus[item.dept] || {};
            const isOnline = statusObj.status === 'ONLINE';

            return (
              <div 
                key={item.dept}
                className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                  isOnline 
                    ? 'bg-gradient-to-b from-white to-slate-50/80 border-slate-200/90 shadow-sm' 
                    : 'bg-gradient-to-b from-red-50/50 to-red-100/30 border-red-200 shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-sm text-slate-900">{item.label}</span>
                    <span className={`badge ${isOnline ? 'badge-online' : 'badge-offline'}`}>
                      <span className={`pulse-dot ${isOnline ? 'online' : 'offline'}`}></span>
                      {isOnline ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </div>

                  <div className="space-y-1 font-mono text-[11px] text-slate-500 mb-4 bg-slate-100/60 p-2.5 rounded-xl border border-slate-200/60">
                    <p>• Port: <strong className="text-slate-800">{item.port}</strong></p>
                    <p>• Database: <strong className="text-blue-600">{item.db}</strong></p>
                    <p>• Health: <strong className={isOnline ? 'text-emerald-600' : 'text-red-600'}>
                      {isOnline ? 'Active' : 'Offline'}
                    </strong></p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/70 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">
                    {isOnline ? 'Active Service' : 'Offline'}
                  </span>
                  <button
                    onClick={() => onToggleNode(item.dept)}
                    className={`btn text-xs py-1.5 px-3 ${
                      isOnline ? 'btn-danger' : 'btn-success'
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {isOnline ? 'Set Offline' : 'Set Online'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Search Toolbar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-3">Search Academic Resources</h3>
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by subject or note title (e.g. Distributed Systems, Algorithms, Lab Manual)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-11 py-2.5 text-sm"
            />
          </div>
          <button type="submit" className="btn btn-primary text-sm px-6">
            <Search className="w-4 h-4" />
            Search All Nodes
          </button>
        </form>
      </div>

      {/* Recent Uploads Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900">Recent Academic Uploads</h3>
            <p className="text-xs text-slate-500 mt-0.5">Fetched live across all running department nodes</p>
          </div>
          <button
            onClick={() => setActivePage('resources')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
          >
            <span>View Complete Repository</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-sm font-semibold text-slate-600">Querying department nodes via API Gateway...</p>
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-bold text-slate-800">No academic resources found</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
              All department nodes might be offline. You can upload a new note or toggle node status.
            </p>
            <button onClick={() => setActivePage('upload')} className="btn btn-primary">
              <Upload className="w-4 h-4" />
              Upload First Note
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {resources.slice(0, 6).map((item) => (
              <div key={item.id} className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm card-hover flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="badge badge-dept font-mono text-[11px] font-bold">
                      Node {item.department}
                    </span>
                    <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-100">
                      {item.resourceType || 'Notes'}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-slate-900 text-base mb-1.5 line-clamp-1 group-hover:text-blue-600 transition">
                    {item.title}
                  </h4>
                  <p className="text-xs font-bold text-blue-600 mb-2">{item.subject}</p>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                    {item.description || 'No detailed description provided.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span>By: <strong className="text-slate-700 font-semibold">{item.uploadedBy}</strong></span>
                  <a
                    href={`/api/download?filePath=${encodeURIComponent(item.filePath || '')}&fileName=${encodeURIComponent(item.fileName || item.title + '.pdf')}`}
                    className="btn btn-secondary py-1.5 px-3 text-xs"
                    download
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
