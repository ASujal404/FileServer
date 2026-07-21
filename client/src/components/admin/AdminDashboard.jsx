import React, { useState, useEffect, useContext } from 'react';
import api from '../../services/api';
import { StorageContext } from '../../context/StorageContext';
import AuditLogViewer from './AuditLogViewer';
import { Users, HardDrive, FileText, Trash2, Shield } from 'lucide-react';

const AdminDashboard = () => {
  const { storageStats } = useContext(StorageContext);
  const [users, setUsers] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [usersRes, metricsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/metrics')
      ]);

      if (usersRes.data.success) setUsers(usersRes.data.users);
      if (metricsRes.data.success) setMetrics(metricsRes.data.metrics);
    } catch (err) {
      console.error('[AdminDashboard] Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete user account '${userName}'?`)) return;
    try {
      const res = await api.delete(`/admin/users/${userId}`);
      if (res.data.success) {
        fetchAdminData();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user.');
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Shield size={24} style={{ color: 'var(--purple)' }} />
        System Admin Dashboard & Storage Metrics
      </h2>

      {/* Metrics Row - Only Real Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
            <span>Total Registered Users</span>
            <Users size={18} style={{ color: 'var(--primary)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{storageStats.userCount || users.length}</div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
            <span>Total Files Stored</span>
            <FileText size={18} style={{ color: 'var(--success)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{storageStats.fileCount || 0}</div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
            <span>Server Storage Used</span>
            <HardDrive size={18} style={{ color: 'var(--warning)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{formatBytes(storageStats.usedBytes)}</div>
        </div>
      </div>

      {/* User Management Section */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} /> User Accounts Management
          </span>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Created At</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {u.id.substring(0, 8)}...
                  </td>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`role-tag ${u.role}`}>{u.role}</span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {u.role !== 'admin' && (
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem', color: 'var(--danger)' }}
                        onClick={() => handleDeleteUser(u.id, u.name)}
                        title="Delete User Account"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log Table */}
      <AuditLogViewer />
    </div>
  );
};

export default AdminDashboard;
