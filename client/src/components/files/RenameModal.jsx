import React, { useState, useEffect } from 'react';
import { Edit3, X, Info } from 'lucide-react';

const RenameModal = ({ file, isOpen, onClose, onRename, isShared = false }) => {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (file) {
      setNewName(file.original_filename || file.name || '');
      setError('');
    }
  }, [file]);

  if (!isOpen || !file) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onRename(file.id, newName);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Rename failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Edit3 size={18} style={{ color: 'var(--primary)' }} />
            Rename {file.type === 'folder' ? 'Folder' : 'File'}
          </h3>
          <X style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={onClose} />
        </div>

        {isShared && (
          <div style={{ padding: '0.75rem', background: 'rgba(139, 92, 246, 0.12)', border: '1px solid var(--purple)', borderRadius: '6px', color: 'var(--purple)', fontSize: '0.825rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Info size={18} style={{ flexShrink: 0 }} />
            <span>This action creates your own editable copy. The original owner's file will remain unchanged.</span>
          </div>
        )}

        {error && (
          <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)', borderRadius: '6px', color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              className="form-input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Name'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RenameModal;
