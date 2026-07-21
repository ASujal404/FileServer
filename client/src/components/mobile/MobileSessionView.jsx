import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { HardDrive, FileText, Folder, Download, Search, ShieldOff, CheckCircle, RefreshCw, FolderOpen } from 'lucide-react';

const MobileSessionView = () => {
  // Extract token directly from current URL pathname
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const token = pathname.includes('/mobile/session/')
    ? pathname.split('/mobile/session/')[1]?.split('/')[0] || ''
    : '';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [socket, setSocket] = useState(null);

  const getBackendUrl = () => {
    if (typeof window === 'undefined') return 'http://localhost:5000';
    const saved = localStorage.getItem('SERVER_URL');
    if (saved) return saved.replace(/\/$/, '');
    const origin = window.location.origin;
    if (origin.includes(':5173')) return origin.replace(':5173', ':5000');
    if (origin.includes(':3000')) return origin.replace(':3000', ':5000');
    return origin;
  };

  const fetchSessionData = async () => {
    if (!token) {
      setError('Invalid QR Session URL: Token parameter missing.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const backendUrl = getBackendUrl();
      const res = await axios.get(`${backendUrl}/mobile/session/${token}/data`);
      if (res.data && res.data.success) {
        setData(res.data);
      } else {
        setError(res.data?.error || 'Failed to authenticate mobile QR session.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'QR Session has expired or is invalid.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionData();
  }, [token]);

  // Setup Socket.IO listener for live sync
  useEffect(() => {
    if (!token) return;
    const backendUrl = getBackendUrl();
    const newSocket = io(backendUrl, { transports: ['websocket', 'polling'] });
    setSocket(newSocket);

    newSocket.on('qr:revoked', () => {
      setError('This QR Session was revoked from desktop.');
    });

    newSocket.on('file:uploaded', () => fetchSessionData());
    newSocket.on('file:renamed', () => fetchSessionData());
    newSocket.on('file:deleted', () => fetchSessionData());
    newSocket.on('folder:uploaded', () => fetchSessionData());

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  const handleDownload = (fileId) => {
    const backendUrl = getBackendUrl();
    const downloadUrl = `${backendUrl}/mobile/session/${token}/download/${fileId}`;
    window.open(downloadUrl, '_blank');
  };

  const formatBytes = (bytes) => {
    const num = parseInt(bytes || 0, 10);
    if (!num || num === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(num) / Math.log(k));
    return parseFloat((num / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={36} className="spin" style={{ color: '#3b82f6', marginBottom: '0.75rem' }} />
          <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Authenticating Mobile QR Session...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#fff', padding: '1.5rem' }}>
        <div style={{ background: '#1e293b', padding: '2rem', borderRadius: '16px', textAlign: 'center', maxWidth: '380px', border: '1px solid #334155' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '50%', color: '#ef4444', marginBottom: '1rem' }}>
            <ShieldOff size={40} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Access Revoked or Expired</h3>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.5rem', lineHeight: 1.5 }}>
            {error || 'The temporary QR session token is no longer valid. Please generate a new QR code on your desktop app.'}
          </p>
          <button
            onClick={fetchSessionData}
            style={{
              marginTop: '1.25rem',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              padding: '0.6rem 1.25rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <RefreshCw size={14} /> Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const user = data.user || { name: 'User', email: '' };
  const metrics = data.metrics || { fileCount: 0, folderCount: 0, usedBytes: 0 };
  const filesList = Array.isArray(data.files) ? data.files : [];
  const foldersList = Array.isArray(data.folders) ? data.folders : [];

  const filteredFiles = filesList.filter(f => {
    const filename = f.original_filename || f.name || '';
    return filename.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif', paddingBottom: '2rem' }}>
      {/* Mobile Top Header */}
      <div style={{ background: '#1e293b', padding: '1.25rem 1rem', borderBottom: '1px solid #334155', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '0.5rem', borderRadius: '8px', color: '#3b82f6' }}>
              <HardDrive size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Network File Server</h1>
              <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: 0 }}>Mobile Session Active</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', padding: '0.3rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600 }}>
            <CheckCircle size={12} /> Live Sync
          </div>
        </div>
      </div>

      <div style={{ padding: '1rem' }}>
        {/* User Profile Metrics Card */}
        <div style={{ background: '#1e293b', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: '#3b82f6', width: '42px', height: '42px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem' }}>
              {(user.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{user.name || 'User'}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{user.email}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', background: '#0f172a', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Storage</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b', marginTop: '0.1rem' }}>{formatBytes(metrics.usedBytes)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Files</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#3b82f6', marginTop: '0.1rem' }}>{metrics.fileCount}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Folders</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981', marginTop: '0.1rem' }}>{metrics.folderCount}</div>
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search mobile files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 0.8rem 0.65rem 2.4rem',
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />
        </div>

        {/* File Listing Header */}
        <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#cbd5e1' }}>
          <FileText size={16} style={{ color: '#3b82f6' }} />
          Files ({filteredFiles.length})
        </div>

        {/* Files List & Empty State */}
        {filteredFiles.length === 0 ? (
          <div style={{ background: '#1e293b', padding: '2.5rem 1.5rem', textAlign: 'center', borderRadius: '12px', border: '1px dashed #334155' }}>
            <div style={{ display: 'inline-flex', padding: '0.8rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', color: '#3b82f6', marginBottom: '0.75rem' }}>
              <FolderOpen size={32} />
            </div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc', margin: '0 0 0.4rem 0' }}>
              {searchTerm ? 'No matching files found' : 'No files stored in repository'}
            </h4>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
              {searchTerm
                ? `No files match your search query "${searchTerm}".`
                : 'Upload files from your desktop dashboard to access them on mobile.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {filteredFiles.map((file) => {
              const filename = file.original_filename || file.name || 'Untitled File';
              return (
                <div
                  key={file.id || Math.random()}
                  style={{
                    background: '#1e293b',
                    borderRadius: '10px',
                    padding: '0.85rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: '1px solid #334155'
                  }}
                >
                  <div style={{ overflow: 'hidden', marginRight: '0.5rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {filename}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                      {formatBytes(file.file_size)} • v{file.version || 1}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownload(file.id)}
                    style={{
                      background: 'rgba(59, 130, 246, 0.15)',
                      border: '1px solid #3b82f6',
                      color: '#3b82f6',
                      padding: '0.4rem 0.75rem',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <Download size={14} /> Download
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileSessionView;
