import React, { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Folder, UploadCloud, Shield, Activity, HardDrive, Users } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const { user } = useContext(AuthContext);

  return (
    <aside className="sidebar">
      <div>
        <div className="brand">
          <HardDrive size={24} />
          <span>FileServer GUI</span>
        </div>

        <ul className="nav-list">
          <li
            className={`nav-item ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            <Folder size={18} />
            <span>My Files</span>
          </li>

          <li
            className={`nav-item ${activeTab === 'shared' ? 'active' : ''}`}
            onClick={() => setActiveTab('shared')}
          >
            <Users size={18} />
            <span>Shared With Me</span>
          </li>

          <li
            className={`nav-item ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            <UploadCloud size={18} />
            <span>Upload Queue</span>
          </li>

          <li
            className={`nav-item ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            <Activity size={18} />
            <span>Audit Logs</span>
          </li>

          {user && user.role === 'admin' && (
            <li
              className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              <Shield size={18} />
              <span>Admin Panel</span>
            </li>
          )}
        </ul>
      </div>

      <div style={{ padding: '1rem', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Network Architecture</div>
        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Client-Server LAN</div>
        <div style={{ fontSize: '0.7rem', color: 'var(--success)', marginTop: '0.3rem' }}>REST API + Socket.IO</div>
      </div>
    </aside>
  );
};

export default Sidebar;
