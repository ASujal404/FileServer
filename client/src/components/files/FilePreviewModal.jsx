import React from 'react';
import { Info, X, FileText, Lock, Unlock, Hash, Calendar, HardDrive, User } from 'lucide-react';

const FilePreviewModal = ({ file, isOpen, onClose }) => {
  if (!isOpen || !file) return null;

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const ext = file.original_filename.split('.').pop().toUpperCase();

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ width: '560px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Info size={20} style={{ color: 'var(--primary)' }} />
            File Metadata & Information
          </h3>
          <X style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={onClose} />
        </div>

        <div style={{ background: 'var(--bg-darker)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', wordBreak: 'break-all' }}>
            {file.original_filename}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <span className="badge badge-version">Version {file.version}</span>
            <span className="badge" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>{ext} File</span>
            {file.is_locked ? (
              <span className="badge badge-locked" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <Lock size={12} /> Locked by {file.owner_name || 'User'}
              </span>
            ) : (
              <span className="badge badge-unlocked" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <Unlock size={12} /> Unlocked
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <HardDrive size={16} style={{ color: 'var(--text-muted)' }} />
            <span style={{ color: 'var(--text-muted)', width: '120px' }}>File Size:</span>
            <span style={{ fontWeight: 500 }}>{formatBytes(file.file_size)} ({file.file_size} bytes)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <User size={16} style={{ color: 'var(--text-muted)' }} />
            <span style={{ color: 'var(--text-muted)', width: '120px' }}>Owner:</span>
            <span style={{ fontWeight: 500 }}>{file.owner_name} ({file.owner_email})</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
            <span style={{ color: 'var(--text-muted)', width: '120px' }}>Upload Time:</span>
            <span style={{ fontWeight: 500 }}>{new Date(file.upload_time).toLocaleString()}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <Hash size={16} style={{ color: 'var(--text-muted)', marginTop: '0.2rem' }} />
            <span style={{ color: 'var(--text-muted)', width: '120px' }}>SHA-256 Hash:</span>
            <code style={{ fontSize: '0.75rem', background: 'var(--bg-darker)', padding: '0.3rem 0.5rem', borderRadius: '4px', wordBreak: 'break-all', flex: 1, fontFamily: 'var(--font-mono)' }}>
              {file.file_hash}
            </code>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;
