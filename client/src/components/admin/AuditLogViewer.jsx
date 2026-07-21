import React, { useState, useEffect, useContext } from 'react';
import api from '../../services/api';
import { SocketContext } from '../../context/SocketContext';
import { Activity, ShieldAlert, Filter } from 'lucide-react';

const AuditLogViewer = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const { socket } = useContext(SocketContext);

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  useEffect(() => {
    if (!socket) return;
    socket.on('audit:logged', fetchLogs);
    return () => socket.off('audit:logged', fetchLogs);
  }, [socket]);

  const fetchLogs = async () => {
    try {
      const res = await api.get(`/logs${actionFilter ? `?action=${actionFilter}` : ''}`);
      if (res.data.success) {
        setLogs(res.data.logs);
      }
    } catch (err) {
      console.error('[AuditLogViewer] Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeColor = (action) => {
    switch (action) {
      case 'UPLOAD': return 'var(--primary)';
      case 'DELETE': return 'var(--danger)';
      case 'LOGIN': return 'var(--success)';
      case 'LOGOUT': return 'var(--text-muted)';
      case 'RENAME': return 'var(--purple)';
      case 'LOCK':
      case 'UNLOCK': return 'var(--warning)';
      default: return 'var(--primary)';
    }
  };

  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: '1.5rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={20} style={{ color: 'var(--primary)' }} />
          System Audit & Security Activity Logs
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} style={{ color: 'var(--text-muted)' }} />
          <select
            className="form-input"
            style={{ width: '160px', padding: '0.35rem 0.6rem' }}
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">All Actions</option>
            <option value="LOGIN">LOGIN</option>
            <option value="LOGOUT">LOGOUT</option>
            <option value="UPLOAD">UPLOAD</option>
            <option value="DOWNLOAD">DOWNLOAD</option>
            <option value="RENAME">RENAME</option>
            <option value="DELETE">DELETE</option>
            <option value="LOCK">LOCK</option>
          </select>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>Target File</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Fetching audit records...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No audit log records found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>

                  <td style={{ fontWeight: 500 }}>
                    {log.user_name || 'System User'}
                  </td>

                  <td>
                    <span className="badge" style={{ background: `rgba(255, 255, 255, 0.05)`, color: getActionBadgeColor(log.action), border: `1px solid ${getActionBadgeColor(log.action)}` }}>
                      {log.action}
                    </span>
                  </td>

                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                    {log.filename || '-'}
                  </td>

                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {log.details || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLogViewer;
