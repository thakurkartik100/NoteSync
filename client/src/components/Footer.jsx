import React from 'react';
import { Server, ShieldCheck, Database, Layers } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-16 bg-white border-t border-slate-200 py-8 text-slate-600 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-6">
          <div>
            <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-600" />
              NoteSync Platform
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Distributed academic resource platform serving lecture notes, question papers, and lab manuals across independent department node servers.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Department Nodes
            </h4>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>• Node CE: Computer Engineering (Port 5001)</li>
              <li>• Node IT: Information Technology (Port 5002)</li>
              <li>• Node E&TC: Electronics & Telecom (Port 5003)</li>
              <li>• API Gateway: Gateway Router (Port 5000)</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              Resource Categories
            </h4>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>• Lecture Notes & Formula Sheets</li>
              <li>• Previous Year Question Papers</li>
              <li>• Lab Write-ups & Manuals</li>
              <li>• Course Assignments & Solutions</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              System Architecture
            </h4>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>• Autonomous Node Storage</li>
              <li>• Real-Time Heartbeat Monitoring</li>
              <li>• Fault Tolerance & Failover</li>
              <li>• Location-Transparent API Gateway</li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400">
          <p>© 2026 NoteSync Distributed Notes Sharing System. All rights reserved.</p>
          <p className="mt-2 sm:mt-0 font-medium text-slate-500">Academic Resource Network</p>
        </div>
      </div>
    </footer>
  );
}
