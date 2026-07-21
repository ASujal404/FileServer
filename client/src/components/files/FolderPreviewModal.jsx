import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Folder, X, HardDrive, Layers, FileText, Lock, Unlock, Users, Calendar } from 'lucide-react';

const FolderPreviewModal = ({ folder, isOpen, onClose }) => {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (folder && isOpen) {
      fetchPreview();
    }
  }, [folder, isOpen]);

  const fetchPreview = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/folders/preview/${folder.id}`);
      if (res.data.success) {
        setInfo(res.data.info);
      }
    } catch (err) {
      console.error('[FolderPreviewModal] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !folder) return null;

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ width: '580px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Folder size={20} style={{ color: 'var(--warning)' }} />
            Folder Directory Metadata & Hierarchy
          </h3>
          <X style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={onClose} />
        </div>

        <div style={{ background: 'var(--bg-darker)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
            📁 {folder.name}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>
            Path: {folder.relative_path}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <span className="badge badge-version">Version {folder.version}</span>
            {folder.is_locked ? (
              <span className="badge badge-locked" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <Lock size={12} /> Locked
              </span>
            ) : (
              <span className="badge badge-unlocked" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <Unlock size={12} /> Unlocked
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Calculating folder size and recursive directory tree...
          </div>
        ) : info ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <HardDrive size={16} style={{ color: 'var(--warning)' }} />
              <span style={{ color: 'var(--text-muted)', width: '160px' }}>Total Size:</span>
              <span style={{ fontWeight: 600 }}>{formatBytes(info.totalSize)}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FileText size={16} style={{ color: 'var(--primary)' }} />
              <span style={{ color: 'var(--text-muted)', width: '160px' }}>Contained Files:</span>
              <span style={{ fontWeight: 600 }}>{info.fileCount} file(s)</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Folder size={16} style={{ color: 'var(--purple)' }} />
              <span style={{ color: 'var(--text-muted)', width: '160px' }}>Nested Subfolders:</span>
              <span style={{ fontWeight: 600 }}>{info.subfolderCount} subfolder(s)</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Layers size={16} style={{ color: 'var(--success)' }} />
              <span style={{ color: 'var(--text-muted)', width: '160px' }}>Tree Depth Level:</span>
              <span style={{ fontWeight: 600 }}>Level {info.maxDepth}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Users size={16} style={{ color: 'var(--text-muted)' }} />
              <span style={{ color: 'var(--text-muted)', width: '160px' }}>Folder Owner:</span>
              <span style={{ fontWeight: 500 }}>{folder.owner_name}</span>
            </div>
          </div>
        ) : null}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};

export default FolderPreviewModal;
