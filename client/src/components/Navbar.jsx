import React from 'react';
import { Network, FolderSync, Upload, Cpu, BookOpen, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Navbar({ activePage, setActivePage, nodeStatus }) {
  const onlineCount = Object.values(nodeStatus || {}).filter(n => n.status === 'ONLINE').length;
  const totalCount = Object.keys(nodeStatus || {}).length || 3;

  return (
    <header className="sticky top-0 z-50 glass-header border-b border-slate-200/80 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo */}
          <div 
            onClick={() => setActivePage('dashboard')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform duration-200">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl text-slate-900 tracking-tight group-hover:text-blue-600 transition">
                  NoteSync
                </span>
                <span className="bg-blue-50 text-blue-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
                  Academic Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Department Resource Network</p>
            </div>
          </div>

          {/* Clean User Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-100/70 p-1 rounded-xl border border-slate-200/60">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: FolderSync },
              { id: 'resources', label: 'Resources', icon: BookOpen },
              { id: 'upload', label: 'Upload Note', icon: Upload },
              { id: 'nodes', label: 'Department Nodes', icon: Cpu }
            ].map(item => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-white text-blue-600 shadow-sm font-bold border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Node Health Status Indicator */}
          <div className="flex items-center gap-3">
            <div 
              onClick={() => setActivePage('nodes')}
              className={`cursor-pointer px-3.5 py-1.5 rounded-full text-xs font-bold border flex items-center gap-2 transition-all duration-200 shadow-sm ${
                onlineCount === totalCount
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/80 hover:shadow'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100/80 hover:shadow'
              }`}
              title="Click to view department node status"
            >
              {onlineCount === totalCount ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 animate-pulse" />
              )}
              <span>Nodes: {onlineCount}/{totalCount} Online</span>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
