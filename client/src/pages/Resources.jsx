import React, { useState } from 'react';
import { Search, Filter, BookOpen, Download, Trash2, Tag, Server, CheckCircle, AlertTriangle } from 'lucide-react';

export default function Resources({ resources, onDeleteResource, nodeStatus, onSearch, loading }) {
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredResources = resources.filter(res => {
    if (selectedDept !== 'ALL') {
      const targetDept = res.department.toUpperCase();
      if (selectedDept === 'ETC' && targetDept !== 'E&TC' && targetDept !== 'ETC') return false;
      if (selectedDept !== 'ETC' && targetDept !== selectedDept) return false;
    }
    if (selectedType !== 'ALL' && res.resourceType !== selectedType) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = res.title.toLowerCase().includes(q);
      const subjectMatch = res.subject.toLowerCase().includes(q);
      const descMatch = (res.description || '').toLowerCase().includes(q);
      return titleMatch || subjectMatch || descMatch;
    }
    return true;
  });

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            Academic Resource Repository
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Search, filter, and access study materials distributed across autonomous department nodes.
          </p>
        </div>

        {/* Live Node Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {['CE', 'IT', 'E&TC'].map(dept => {
            const isOnline = nodeStatus[dept]?.status === 'ONLINE';
            return (
              <div 
                key={dept} 
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${
                  isOnline 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                <span className={`pulse-dot ${isOnline ? 'online' : 'offline'}`}></span>
                <span>Node {dept}: {isOnline ? 'ONLINE' : 'OFFLINE'}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Department Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Department Node</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="input-field cursor-pointer text-xs font-semibold"
            >
              <option value="ALL">All Departments (CE + IT + E&TC)</option>
              <option value="CE">Computer Engineering (Node CE)</option>
              <option value="IT">Information Technology (Node IT)</option>
              <option value="ETC">Electronics & Telecom (Node E&TC)</option>
            </select>
          </div>

          {/* Resource Type Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Resource Category</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="input-field cursor-pointer text-xs font-semibold"
            >
              <option value="ALL">All Categories</option>
              <option value="Notes">Lecture Notes</option>
              <option value="Question Papers">Question Papers</option>
              <option value="Lab Manuals">Lab Manuals</option>
              <option value="Assignments">Assignments</option>
              <option value="Study Materials">Study Materials</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Keyword Search</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Subject or Title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-9 text-xs"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Results List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Found {filteredResources.length} Resources
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-sm font-semibold text-slate-600">Querying active nodes...</p>
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-bold text-slate-700">No resources match your query</p>
            <p className="text-xs text-slate-500 mt-1">Try resetting filters or checking if the department node is online.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredResources.map((item) => (
              <div key={item.id} className="card flex flex-col justify-between bg-white hover:border-blue-300">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="badge badge-dept font-mono text-[11px]">
                      Node {item.department}
                    </span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-bold">
                      {item.resourceType || 'Notes'}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-base mb-1 line-clamp-2">
                    {item.title}
                  </h4>
                  <p className="text-xs font-semibold text-blue-600 mb-2">{item.subject}</p>
                  <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed mb-4">
                    {item.description || 'No detailed description provided.'}
                  </p>
                </div>

                <div>
                  <div className="py-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 mb-3">
                    <span>Uploaded by: <strong className="text-slate-600">{item.uploadedBy}</strong></span>
                    <span>{new Date(item.uploadDate).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <a
                      href={`/api/download?filePath=${encodeURIComponent(item.filePath || '')}&fileName=${encodeURIComponent(item.fileName || item.title + '.pdf')}`}
                      className="btn btn-primary py-1.5 px-3 text-xs flex-1 text-center"
                      download
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download File
                    </a>

                    <button
                      onClick={() => onDeleteResource(item.department, item.id)}
                      className="btn btn-danger py-1.5 px-2.5 text-xs"
                      title="Delete from Department Node DB"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
