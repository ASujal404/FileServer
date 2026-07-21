import React, { useContext, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { SocketContext } from '../../context/SocketContext';
import { getServerUrl } from '../../services/api';
import ServerConfigModal from './ServerConfigModal';
import { Server, Wifi, WifiOff, LogOut, User } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { isConnected } = useContext(SocketContext);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const serverUrl = getServerUrl();

  return (
    <>
      <header className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className={`connection-badge ${isConnected ? '' : 'offline'}`}>
            {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{isConnected ? 'LAN Connected' : 'Server Offline'}</span>
            <span style={{ opacity: 0.7 }}>({serverUrl})</span>
          </div>

          <button
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
            onClick={() => setIsConfigOpen(true)}
            title="Configure LAN Server IP"
          >
            <Server size={14} /> Change IP
          </button>
        </div>

        {user && (
          <div className="user-profile">
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={14} /> {user.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
            </div>
            <span className={`role-tag ${user.role}`}>{user.role}</span>
            <button className="btn btn-secondary" onClick={logout} style={{ padding: '0.4rem 0.8rem' }} title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        )}
      </header>

      <ServerConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />
    </>
  );
};

export default Navbar;
