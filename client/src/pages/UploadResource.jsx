import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Server } from 'lucide-react';

export default function UploadResource({ nodeStatus, onUploadSuccess, setActivePage }) {
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    department: 'CE',
    resourceType: 'Notes',
    description: '',
    uploadedBy: 'Student User'
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    setMessage(null);

    const targetDept = formData.department;
    const nodeState = nodeStatus[targetDept];

    if (nodeState && nodeState.status === 'OFFLINE') {
      setMessage({
        type: 'error',
        text: `Target Department Node [Node ${targetDept}] is OFFLINE! Please toggle the node ONLINE to upload.`
      });
      setUploading(false);
      return;
    }

    if (!selectedFile) {
      setMessage({
        type: 'error',
        text: 'Please select an academic file to upload.'
      });
      setUploading(false);
      return;
    }

    try {
      const dataPayload = new FormData();
      dataPayload.append('file', selectedFile);
      dataPayload.append('title', formData.title);
      dataPayload.append('subject', formData.subject);
      dataPayload.append('department', formData.department);
      dataPayload.append('resourceType', formData.resourceType);
      dataPayload.append('description', formData.description);
      dataPayload.append('uploadedBy', formData.uploadedBy);

      const response = await fetch('/api/resources/upload', {
        method: 'POST',
        headers: {
          'x-department': formData.department
        },
        body: dataPayload
      });

      const text = await response.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        throw new Error(text || 'Server returned invalid upload response');
      }

      if (!response.ok) {
        const errorText = data.error || data.message || (typeof data === 'string' ? data : `Upload failed with status ${response.status}`);
        throw new Error(errorText);
      }

      setMessage({
        type: 'success',
        text: `Resource successfully stored in Node ${formData.department} Database!`
      });

      onUploadSuccess();

      // Reset form
      setFormData({
        title: '',
        subject: '',
        department: 'CE',
        resourceType: 'Notes',
        description: '',
        uploadedBy: 'Student User'
      });
      setSelectedFile(null);

      setTimeout(() => {
        setActivePage('resources');
      }, 1500);

    } catch (err) {
      setMessage({
        type: 'error',
        text: err.message
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <Upload className="w-6 h-6 text-blue-600" />
          Upload Academic Resource
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Upload notes, question papers, or manuals to be stored autonomously in the corresponding department node.
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-semibold ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Upload Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          
          {/* Target Department */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
              Target Department Node *
            </label>
            <select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="input-field cursor-pointer text-xs font-bold"
              required
            >
              <option value="CE">Computer Engineering (Node CE - Port 5001)</option>
              <option value="IT">Information Technology (Node IT - Port 5002)</option>
              <option value="E&TC">Electronics & Telecom (Node E&TC - Port 5003)</option>
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Resource will be dispatched directly to this node's isolated storage.
            </p>
          </div>

          {/* Resource Category */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
              Resource Category *
            </label>
            <select
              value={formData.resourceType}
              onChange={(e) => setFormData({ ...formData, resourceType: e.target.value })}
              className="input-field cursor-pointer text-xs font-semibold"
              required
            >
              <option value="Notes">Lecture Notes</option>
              <option value="Question Papers">Question Papers</option>
              <option value="Lab Manuals">Lab Manuals</option>
              <option value="Assignments">Assignments</option>
              <option value="Study Materials">Study Materials</option>
            </select>
          </div>

        </div>

        {/* Resource Title */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
            Resource Title *
          </label>
          <input
            type="text"
            placeholder="e.g. Distributed Systems Unit 3 Lecture Notes"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="input-field text-sm"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Subject Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
              Subject Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Distributed Systems, Algorithms"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="input-field text-sm"
              required
            />
          </div>

          {/* Uploaded By */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
              Uploader Name
            </label>
            <input
              type="text"
              placeholder="Student or Faculty name"
              value={formData.uploadedBy}
              onChange={(e) => setFormData({ ...formData, uploadedBy: e.target.value })}
              className="input-field text-sm"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
            Brief Description
          </label>
          <textarea
            rows="3"
            placeholder="Provide key topics covered or instructions for students..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="input-field text-sm"
          ></textarea>
        </div>

        {/* File Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
            Academic File (PDF / PPT / DOCX)
          </label>
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-400 bg-slate-50 transition">
            <FileText className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <input
              type="file"
              id="file-input"
              className="hidden"
              accept=".pdf,.ppt,.pptx,.doc,.docx,.txt"
              onChange={(e) => setSelectedFile(e.target.files[0])}
            />
            <label htmlFor="file-input" className="btn btn-secondary text-xs cursor-pointer mb-2">
              Browse Academic File
            </label>
            <p className="text-xs text-slate-500 font-medium">
              {selectedFile ? `Selected: ${selectedFile.name}` : 'Supports PDF, PPT, DOCX up to 25MB'}
            </p>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setActivePage('dashboard')}
            className="btn btn-secondary text-xs"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={uploading}
            className="btn btn-primary text-xs min-w-[140px]"
          >
            {uploading ? (
              <>
                <div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Upload to Node</span>
              </>
            )}
          </button>
        </div>

      </form>

    </div>
  );
}
