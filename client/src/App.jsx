import React, { useState, useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import DropzoneUpload from './components/files/DropzoneUpload';
import FileListTable from './components/files/FileListTable';
import AuditLogViewer from './components/admin/AuditLogViewer';
import AdminDashboard from './components/admin/AdminDashboard';
import MobileSessionView from './components/mobile/MobileSessionView';
import { StorageProvider } from './context/StorageContext';

const MainLayout = () => {
  const [activeTab, setActiveTab] = useState('files'); // 'files', 'shared', 'upload', 'logs', 'admin'

  return (
    <StorageProvider>
      <div className="app-container">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="main-wrapper">
          <Navbar />

          <main className="content-body">
            {activeTab === 'files' && (
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>
                  My File Storage Repository
                </h2>
                <FileListTable />
              </div>
            )}

            {activeTab === 'shared' && (
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>
                  Shared With Me (Google Drive Style Permissions)
                </h2>
                <FileListTable isSharedWithMeView={true} />
              </div>
            )}

            {activeTab === 'upload' && (
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>
                  Upload Files to Storage Server
                </h2>
                <DropzoneUpload />
              </div>
            )}

            {activeTab === 'logs' && (
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>
                  Security & Activity Audit Logs
                </h2>
                <AuditLogViewer />
              </div>
            )}

            {activeTab === 'admin' && <AdminDashboard />}
          </main>
        </div>
      </div>
    </StorageProvider>
  );
};

const App = () => {
  const { user, loading } = useContext(AuthContext);
  const [isRegistering, setIsRegistering] = useState(false);

  // Check if mobile session URL parameter exists
  const pathname = window.location.pathname;
  if (pathname.startsWith('/mobile/session/')) {
    return <MobileSessionView />;
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-darker)', color: 'var(--text-muted)' }}>
        Initializing Network File Server Client...
      </div>
    );
  }

  if (!user) {
    return isRegistering ? (
      <Register onSwitchToLogin={() => setIsRegistering(false)} />
    ) : (
      <Login onSwitchToRegister={() => setIsRegistering(true)} />
    );
  }

  return <MainLayout />;
};

export default App;
