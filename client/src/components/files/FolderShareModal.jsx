import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Share2, X, Check, User } from 'lucide-react';

const FolderShareModal = ({ folder, isOpen, onClose, onShare }) => {
  const [users, setUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && folder) {
      fetchUsers();
      try {
        const existing = JSON.parse(folder.shared_with || '[]');
        setSelectedUserIds(existing);
      } catch {
        setSelectedUserIds([]);
      }
    }
  }, [isOpen, folder]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      if (res.data.success) {
        setUsers(res.data.users.filter(u => u.id !== folder.owner_id));
      }
    } catch {
      // ignore
    }
  };

  if (!isOpen || !folder) return null;

  const handleToggleUser = (userId) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onShare(folder.id, selectedUserIds);
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to share folder.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ width: '480px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Share2 size={18} style={{ color: 'var(--purple)' }} />
            Share Folder Permissions
          </h3>
          <X style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={onClose} />
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Select users allowed to view and access folder <strong>'{folder.name}'</strong> over LAN.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--bg-darker)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
            {users.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                No other registered users found.
              </div>
            ) : (
              users.map(u => (
                <div
                  key={u.id}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem', background: 'var(--bg-card)', borderRadius: '4px', cursor: 'pointer' }}
                  onClick={() => handleToggleUser(u.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <User size={14} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontWeight: 500 }}>{u.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({u.email})</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(u.id)}
                    onChange={() => {}}
                  />
                </div>
              ))
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Permissions'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FolderShareModal;
