import React, { useState } from 'react';
import { getServerUrl, setServerUrl } from '../../services/api';
import { Server, Check, X } from 'lucide-react';

const ServerConfigModal = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState(getServerUrl());
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    const updated = setServerUrl(url);
    setUrl(updated);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
      window.location.reload(); // Reconnect to new LAN IP
    }, 800);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Server className="icon" style={{ color: 'var(--primary)' }} />
            Configure Server Connection
          </h3>
          <X style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={onClose} />
        </div>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>Server IP Address / URL (LAN)</label>
            <input
              type="text"
              className="form-input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="e.g. http://192.168.1.100:5000"
              required
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.4rem' }}>
              Enter the IP address of the server host running on your local network.
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {saved ? <Check size={16} /> : 'Save & Reconnect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServerConfigModal;
