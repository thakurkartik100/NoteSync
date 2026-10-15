import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Dashboard from './pages/Dashboard';
import Resources from './pages/Resources';
import UploadResource from './pages/UploadResource';
import NodesMonitor from './pages/NodesMonitor';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [resources, setResources] = useState([]);
  const [nodeStatus, setNodeStatus] = useState({
    CE: { status: 'ONLINE' },
    IT: { status: 'ONLINE' },
    'E&TC': { status: 'ONLINE' }
  });
  const [loading, setLoading] = useState(true);

  // Fetch Node Statuses
  const fetchNodes = async () => {
    try {
      const resp = await fetch('/api/nodes');
      if (resp.ok) {
        const text = await resp.text();
        const data = text ? JSON.parse(text) : {};
        if (data.nodes) setNodeStatus(data.nodes);
      }
    } catch (err) {
      console.warn('Gateway health fetch error:', err.message);
    }
  };

  // Fetch Resources from API Gateway
  const fetchResources = async (queryParam = '') => {
    setLoading(true);
    try {
      const url = queryParam ? `/api/resources?search=${encodeURIComponent(queryParam)}` : '/api/resources';
      const resp = await fetch(url);
      if (resp.ok) {
        const text = await resp.text();
        const data = text ? JSON.parse(text) : {};
        setResources(data.resources || []);
      }
    } catch (err) {
      console.error('Fetch resources error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Toggle Node ONLINE / OFFLINE
  const handleToggleNode = async (dept) => {
    try {
      const resp = await fetch(`/api/nodes/${encodeURIComponent(dept)}/toggle`, { method: 'POST' });
      if (resp.ok) {
        await fetchNodes();
        await fetchResources();
      }
    } catch (err) {
      console.error('Toggle node error:', err.message);
    }
  };

  // Delete Resource
  const handleDeleteResource = async (dept, id) => {
    if (!window.confirm('Delete this resource from department node database?')) return;
    try {
      const resp = await fetch(`/api/resources/${encodeURIComponent(dept)}/${id}`, { method: 'DELETE' });
      if (resp.ok) {
        await fetchNodes();
        await fetchResources();
      }
    } catch (err) {
      console.error('Delete resource error:', err.message);
    }
  };

  useEffect(() => {
    fetchNodes();
    fetchResources();

    let ws = null;
    try {
      ws = new WebSocket('ws://localhost:5000');
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'NODE_STATUS_UPDATE' && data.nodes) {
            setNodeStatus(data.nodes);
          } else if (data.type === 'RESOURCE_UPLOADED' || data.type === 'RESOURCE_DELETED') {
            fetchResources();
          }
        } catch (err) {}
      };
    } catch (err) {}

    const interval = setInterval(() => {
      fetchNodes();
    }, 5000);

    return () => {
      clearInterval(interval);
      if (ws) ws.close();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      
      {/* Top Navbar */}
      <Navbar 
        activePage={activePage} 
        setActivePage={setActivePage} 
        nodeStatus={nodeStatus} 
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activePage === 'dashboard' && (
          <Dashboard 
            resources={resources} 
            nodeStatus={nodeStatus} 
            setActivePage={setActivePage} 
            onSearch={fetchResources}
            onToggleNode={handleToggleNode}
            loading={loading}
          />
        )}

        {activePage === 'resources' && (
          <Resources 
            resources={resources} 
            onDeleteResource={handleDeleteResource}
            nodeStatus={nodeStatus}
            onSearch={fetchResources}
            loading={loading}
          />
        )}

        {activePage === 'upload' && (
          <UploadResource 
            nodeStatus={nodeStatus}
            onUploadSuccess={fetchResources}
            setActivePage={setActivePage}
          />
        )}

        {activePage === 'nodes' && (
          <NodesMonitor 
            nodeStatus={nodeStatus}
            onToggleNode={handleToggleNode}
          />
        )}
      </main>

      {/* Footer */}
      <Footer />

    </div>
  );
}
