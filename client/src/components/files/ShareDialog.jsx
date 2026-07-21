import React, { useState, useEffect, useContext } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { Share2, X, Search, User, ShieldCheck, Trash2 } from 'lucide-react';

const ShareDialog = ({ item, isFolder = false, isOpen, onClose, onShare, onRevoke }) => {
  const { user: currentUser } = useContext(AuthContext);
  const [allUsers, setAllUsers] = useState([]);
  const [sharedUsers, setSharedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [permission, setPermission] = useState('viewer'); // 'viewer' | 'editor'
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Load ALL users ONCE when Share Dialog opens
  useEffect(() => {
    if (isOpen && item) {
      setSelectedUserIds([]);
      setSearchQuery('');
      loadUsersAndShares();
    }
  }, [isOpen, item]);

  const loadUsersAndShares = async () => {
    setLoadingUsers(true);
    try {
      let fetchedUsers = [];

      // Primary Attempt: GET /users
      try {
        const res = await api.get('/users');
        if (res.data && res.data.success && Array.isArray(res.data.users)) {
          fetchedUsers = res.data.users;
        }
      } catch (e1) {
        // Fallback Attempt 1: GET /users/search?q=
        try {
          const searchRes = await api.get('/users/search?q=');
          if (searchRes.data && searchRes.data.success && Array.isArray(searchRes.data.users)) {
            fetchedUsers = searchRes.data.users;
          }
        } catch (e2) {
          // Fallback Attempt 2: GET /admin/users
          try {
            const adminRes = await api.get('/admin/users');
            if (adminRes.data && adminRes.data.success && Array.isArray(adminRes.data.users)) {
              fetchedUsers = adminRes.data.users;
            }
          } catch (e3) {
            console.error('[ShareDialog] All user endpoints failed:', e3);
          }
        }
      }

      // Fetch shared users list
      try {
        const sharedRes = await api.get(`/shared-users?itemId=${item.id}&isFolder=${isFolder}`);
        if (sharedRes.data && sharedRes.data.success) {
          setSharedUsers(sharedRes.data.users);
        }
      } catch (e) {
        // Fallback endpoint
        try {
          const altSharedRes = await api.get(`/share/users/${item.id}?isFolder=${isFolder}`);
          if (altSharedRes.data && altSharedRes.data.success) {
            setSharedUsers(altSharedRes.data.users);
          }
        } catch (err) {
          console.warn('[ShareDialog] Shared users fetch error:', err.message);
        }
      }

      // Exclude current logged-in user from share selection (all another admins and users will appear)
      setAllUsers(fetchedUsers.filter(u => u.id !== currentUser?.id));
    } catch (err) {
      console.error('[ShareDialog] Error loading users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  if (!isOpen || !item) return null;

  const itemName = isFolder ? item.name : item.original_filename;

  // Perform fast local filtering in React state (case insensitive by Name, Email, Role)
  const filteredUsers = allUsers.filter(u => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  });

  const handleToggleUser = (userId) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleShareSubmit = async (e) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) return;
    setSubmitting(true);
    try {
      await onShare({
        itemId: item.id,
        isFolder,
        targetUserIds: selectedUserIds,
        permission
      });
      setSelectedUserIds([]);
      loadUsersAndShares();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to share access.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (targetUserId) => {
    if (!window.confirm('Revoke share access for this user?')) return;
    try {
      await onRevoke({ itemId: item.id, isFolder, targetUserId });
      loadUsersAndShares();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to revoke access.');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ width: '560px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Share2 size={20} style={{ color: 'var(--purple)' }} />
            Share {isFolder ? 'Folder' : 'File'}: <span style={{ color: 'var(--primary)' }}>{itemName}</span>
          </h3>
          <X style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={onClose} />
        </div>

        {/* Share Form */}
        <form onSubmit={handleShareSubmit}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Search & Select Users to Share With</span>
              <span style={{ fontSize: '0.8rem', color: selectedUserIds.length > 0 ? 'var(--purple)' : 'var(--text-muted)', fontWeight: 600 }}>
                Selected ({selectedUserIds.length})
              </span>
            </label>

            <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.2rem', padding: '0.5rem 0.5rem 0.5rem 2.2rem', fontSize: '0.85rem' }}
                placeholder="Search by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'var(--bg-darker)', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
              {loadingUsers ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem' }}>
                  Loading registered users...
                </div>
              ) : allUsers.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem' }}>
                  No users available.
                </div>
              ) : filteredUsers.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem' }}>
                  No matching users found.
                </div>
              ) : (
                filteredUsers.map(u => {
                  const isSelected = selectedUserIds.includes(u.id);
                  const isAdminRole = u.role === 'admin';
                  return (
                    <div
                      key={u.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.6rem 0.85rem',
                        background: isSelected ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-card)',
                        border: isSelected ? '1px solid var(--purple)' : '1px solid var(--border)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => handleToggleUser(u.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: isAdminRole ? 'rgba(139, 92, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isAdminRole ? 'var(--purple)' : 'var(--primary)'
                        }}>
                          {isAdminRole ? <ShieldCheck size={18} /> : <User size={16} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{u.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{u.email}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span className="badge" style={{
                          background: isAdminRole ? 'rgba(139, 92, 246, 0.25)' : 'rgba(59, 130, 246, 0.2)',
                          color: isAdminRole ? 'var(--purple)' : 'var(--primary)',
                          border: isAdminRole ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid rgba(59, 130, 246, 0.3)',
                          textTransform: 'uppercase'
                        }}>
                          {u.role}
                        </span>
                        <button
                          type="button"
                          className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                          style={{
                            padding: '0.25rem 0.6rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: isSelected ? 'var(--purple)' : 'var(--bg-hover)',
                            borderColor: isSelected ? 'var(--purple)' : 'var(--border)'
                          }}
                        >
                          {isSelected ? '✓ Selected' : 'Select'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Permission Level:</span>
              <select
                className="form-input"
                style={{ width: '150px', padding: '0.4rem' }}
                value={permission}
                onChange={(e) => setPermission(e.target.value)}
              >
                <option value="viewer">Viewer (Read & Download)</option>
                <option value="editor">Editor (Full Edit & Upload)</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting || selectedUserIds.length === 0}>
              {submitting ? 'Sharing...' : `Share Access (${selectedUserIds.length})`}
            </button>
          </div>
        </form>

        {/* Already Shared Users List */}
        <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-muted)' }}>
            Users with Access ({sharedUsers.length})
          </h4>

          <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {sharedUsers.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Not shared with anyone yet.</div>
            ) : (
              sharedUsers.map(su => (
                <div key={su.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'var(--bg-darker)', borderRadius: '4px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600 }}>{su.name}</span> <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({su.email})</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="badge" style={{ background: su.permission === 'editor' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: su.permission === 'editor' ? 'var(--purple)' : 'var(--primary)' }}>
                      {su.permission.toUpperCase()}
                    </span>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.25rem 0.5rem', color: 'var(--danger)', fontSize: '0.75rem' }}
                      onClick={() => handleRevoke(su.user_id)}
                      title="Remove Share Access"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareDialog;
