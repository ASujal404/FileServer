import React, { useState, useContext } from 'react';
import { StorageContext } from '../../context/StorageContext';
import { AuthContext } from '../../context/AuthContext';
import { SocketContext } from '../../context/SocketContext';
import { getServerUrl } from '../../services/api';
import FilePreviewModal from './FilePreviewModal';
import FolderPreviewModal from './FolderPreviewModal';
import ShareDialog from './ShareDialog';
import RenameModal from './RenameModal';
import QrCard from './QrCard';
import api from '../../services/api';
import {
  Folder,
  FileText,
  Download,
  Trash2,
  Edit3,
  Info,
  Lock,
  Unlock,
  Share2,
  Search,
  Archive,
  AlertCircle,
  ChevronRight,
  Home,
  Users
} from 'lucide-react';

const FileListTable = ({ isSharedWithMeView = false }) => {
  const {
    files,
    folders,
    sharedFolders,
    sharedFiles,
    loading,
    deleteFile,
    renameFile,
    lockFile,
    unlockFile,
    downloadFolderZip,
    renameFolder,
    deleteFolder,
    lockFolder,
    unlockFolder,
    shareItem,
    revokeShare,
    searchQuery,
    setSearchQuery,
    extensionFilter,
    setExtensionFilter
  } = useContext(StorageContext);

  const { user } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);

  const [currentPath, setCurrentPath] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewFolder, setPreviewFolder] = useState(null);
  const [shareTarget, setShareTarget] = useState(null); // { item, isFolder }
  const [renameTargetItem, setRenameTargetItem] = useState(null);
  const [actionError, setActionError] = useState('');

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const activeFolders = isSharedWithMeView ? sharedFolders : folders;
  const activeFiles = isSharedWithMeView ? sharedFiles : files;

  // Filter Folders and Files based on current breadcrumb path & search query
  const filteredFolders = activeFolders.filter(f => {
    if (searchQuery) {
      return f.name && f.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    if (isSharedWithMeView) {
      if (!currentPath) return true; // Show all shared root folders
      return f.parent_folder === currentPath;
    }
    if (!currentPath) {
      return f.parent_folder === 'ROOT' || f.depth === 0;
    }
    return f.parent_folder === currentPath;
  });

  const filteredFiles = activeFiles.filter(f => {
    if (!f.original_filename) return false;
    const matchesSearch =
      f.original_filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.owner_name && f.owner_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const ext = f.original_filename.split('.').pop().toLowerCase();
    const matchesExt = !extensionFilter || ext === extensionFilter.toLowerCase().replace('.', '');

    if (searchQuery) return matchesSearch && matchesExt;

    if (isSharedWithMeView) {
      if (!currentPath) {
        // At root of Shared With Me, display standalone shared files or top-level shared files
        return (!f.inherited_from_folder || f.parent_folder === 'ROOT' || !f.parent_folder) && matchesExt;
      }
      return f.parent_folder === currentPath && matchesExt;
    }

    if (!currentPath) {
      return (!f.relative_path || !f.relative_path.includes('/')) && matchesExt;
    }
    return f.parent_folder === currentPath && matchesExt;
  });

  const handleFolderClick = (folder) => {
    setCurrentPath(folder.relative_path);
  };

  const handleSingleDownload = async (file) => {
    setActionError('');
    try {
      const res = await api.get(`/download/${file.id}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.original_filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Desktop download error:', err);
      if (err.response && err.response.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          setActionError(json.error || 'Download failed.');
        } catch {
          setActionError('Download failed. Physical file missing on server storage.');
        }
      } else {
        setActionError(err.response?.data?.error || err.message || 'Download failed.');
      }
    }
  };

  const handleBatchZipDownload = async () => {
    if (selectedIds.length === 0) return;
    try {
      const res = await api.post('/download/batch', { fileIds: selectedIds }, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `files_batch_${Date.now()}.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setActionError('Batch download failed.');
    }
  };

  const handleDeleteFile = async (file) => {
    setActionError('');
    if (!window.confirm(`Delete file '${file.original_filename}'?`)) return;
    try {
      await deleteFile(file.id);
    } catch (err) {
      setActionError(err.response?.data?.error || err.message);
    }
  };

  const handleDeleteFolder = async (folder) => {
    setActionError('');
    if (!window.confirm(`Delete folder '${folder.name}' and all contained subfolders/files?`)) return;
    try {
      await deleteFolder(folder.id);
    } catch (err) {
      setActionError(err.response?.data?.error || err.message);
    }
  };

  const handleToggleFileLock = async (file) => {
    setActionError('');
    try {
      if (file.is_locked) await unlockFile(file.id);
      else await lockFile(file.id);
    } catch (err) {
      setActionError(err.response?.data?.error || err.message);
    }
  };

  const handleToggleFolderLock = async (folder) => {
    setActionError('');
    try {
      if (folder.is_locked) await unlockFolder(folder.id);
      else await lockFolder(folder.id);
    } catch (err) {
      setActionError(err.response?.data?.error || err.message);
    }
  };

  const handleRenameSubmit = async (id, newName) => {
    if (renameTargetItem.type === 'folder') {
      await renameFolder(id, newName);
    } else {
      await renameFile(id, newName);
    }
  };

  const pathParts = currentPath ? currentPath.split('/') : [];

  return (
    <div>
      {/* Error Alert */}
      {actionError && (
        <div style={{ padding: '0.85rem 1rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)', borderRadius: '8px', color: 'var(--danger)', fontSize: '0.9rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} />
          {actionError}
        </div>
      )}

      {/* Dashboard Header Layout: Navigation & Search on Left, Permanent QR Card on Right */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Breadcrumb Navigation Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.75rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.9rem' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', color: currentPath ? 'var(--primary)' : 'var(--text-main)', fontWeight: currentPath ? 500 : 700 }}
              onClick={() => setCurrentPath('')}
            >
              {isSharedWithMeView ? <Users size={16} style={{ color: 'var(--purple)' }} /> : <Home size={16} />}
              <span>{isSharedWithMeView ? 'Shared With Me' : 'Root Repository'}</span>
            </div>

            {pathParts.map((part, index) => {
              const pathUntil = pathParts.slice(0, index + 1).join('/');
              const isLast = index === pathParts.length - 1;

              return (
                <React.Fragment key={pathUntil}>
                  <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                  <div
                    style={{ cursor: isLast ? 'default' : 'pointer', color: isLast ? 'var(--text-main)' : 'var(--primary)', fontWeight: isLast ? 700 : 500 }}
                    onClick={() => !isLast && setCurrentPath(pathUntil)}
                  >
                    {part}
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* Filter and Control Toolbar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '240px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="Search files and folders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select
                className="form-input"
                style={{ width: '160px' }}
                value={extensionFilter}
                onChange={(e) => setExtensionFilter(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="pdf">PDF (.pdf)</option>
                <option value="png">Images (.png, .jpg)</option>
                <option value="txt">Text (.txt, .md)</option>
                <option value="zip">Archives (.zip, .7z)</option>
              </select>
            </div>

            {selectedIds.length > 0 && (
              <button className="btn btn-primary" onClick={handleBatchZipDownload}>
                <Archive size={16} /> Batch Zip ({selectedIds.length})
              </button>
            )}
          </div>
        </div>

        {/* Permanent Top-Right QR Card (My Files View Only) */}
        {!isSharedWithMeView && (
          <div style={{ flexShrink: 0 }}>
            <QrCard />
          </div>
        )}
      </div>

      {/* Folders & Files Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>Item Name</th>
                <th>Size</th>
                <th>Version</th>
                <th>{isSharedWithMeView ? 'Shared By' : 'Owner'}</th>
                <th>{isSharedWithMeView ? 'Date Shared' : 'Date'}</th>
                <th>{isSharedWithMeView ? 'Permission' : 'Access / Lock'}</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Loading repository...
                  </td>
                </tr>
              ) : filteredFolders.length === 0 && filteredFiles.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    {isSharedWithMeView ? 'No files have been shared with you.' : 'Directory is empty.'}
                  </td>
                </tr>
              ) : (
                <>
                  {/* FOLDERS LISTING */}
                  {filteredFolders.map((folder) => {
                    const isOwnerOrAdmin = user && (user.role === 'admin' || user.id === folder.owner_id);
                    const isEditor = folder.permission === 'editor' || isOwnerOrAdmin;

                    return (
                      <tr key={`folder-${folder.id}`} style={{ background: 'rgba(245, 158, 11, 0.03)' }}>
                        <td></td>
                        <td style={{ fontWeight: 600, cursor: 'pointer' }} onClick={() => handleFolderClick(folder)}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <Folder size={18} style={{ color: 'var(--warning)' }} />
                            <span style={{ color: 'var(--warning)' }}>{folder.name}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Directory</td>
                        <td><span className="badge badge-version">v{folder.version || 1}</span></td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {isSharedWithMeView ? (folder.shared_by || folder.owner_name || 'System Admin') : folder.owner_name}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {isSharedWithMeView && folder.shared_at
                            ? new Date(folder.shared_at).toLocaleDateString()
                            : folder.created_at ? new Date(folder.created_at).toLocaleDateString() : '-'}
                        </td>
                        <td>
                          {isSharedWithMeView ? (
                            <span className="badge" style={{ background: folder.permission === 'editor' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: folder.permission === 'editor' ? 'var(--purple)' : 'var(--primary)' }}>
                              {folder.permission ? folder.permission.toUpperCase() : 'SHARED'}
                            </span>
                          ) : folder.is_locked ? (
                            <span className="badge badge-locked"><Lock size={12} style={{ display: 'inline', marginRight: '3px' }} /> Locked</span>
                          ) : (
                            <span className="badge badge-unlocked"><Unlock size={12} style={{ display: 'inline', marginRight: '3px' }} /> Open</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                            <button className="btn btn-secondary" style={{ padding: '0.35rem' }} onClick={() => setPreviewFolder(folder)} title="Folder Hierarchy Preview & Size">
                              <Info size={14} />
                            </button>

                            <button className="btn btn-secondary" style={{ padding: '0.35rem', color: 'var(--warning)' }} onClick={() => downloadFolderZip(folder.id, folder.name)} title="Download Folder ZIP Archive">
                              <Archive size={14} />
                            </button>

                            {user && user.role === 'admin' && (
                              <button className="btn btn-secondary" style={{ padding: '0.35rem', color: 'var(--purple)' }} onClick={() => setShareTarget({ item: folder, isFolder: true })} title="Share Folder">
                                <Share2 size={14} />
                              </button>
                            )}

                            {isEditor && (
                              <>
                                <button className="btn btn-secondary" style={{ padding: '0.35rem' }} onClick={() => setRenameTargetItem({ type: 'folder', item: folder })} title="Rename Folder">
                                  <Edit3 size={14} />
                                </button>
                                {isOwnerOrAdmin && (
                                  <>
                                    <button className="btn btn-secondary" style={{ padding: '0.35rem' }} onClick={() => handleToggleFolderLock(folder)} title="Lock/Unlock Folder">
                                      {folder.is_locked ? <Unlock size={14} /> : <Lock size={14} />}
                                    </button>
                                    <button className="btn btn-secondary" style={{ padding: '0.35rem', color: 'var(--danger)' }} onClick={() => handleDeleteFolder(folder)} title="Delete Folder">
                                      <Trash2 size={14} />
                                    </button>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* FILES LISTING */}
                  {filteredFiles.map((file) => {
                    const ext = file.original_filename.split('.').pop().toLowerCase();
                    const isOwnerOrAdmin = user && (user.role === 'admin' || user.id === file.owner_id);
                    const isEditor = file.permission === 'editor' || isOwnerOrAdmin;

                    return (
                      <tr key={`file-${file.id}`}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(file.id)}
                            onChange={() => setSelectedIds(prev => prev.includes(file.id) ? prev.filter(id => id !== file.id) : [...prev, file.id])}
                          />
                        </td>
                        <td style={{ fontWeight: 500 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={16} style={{ color: 'var(--primary)' }} />
                            <span>{file.original_filename}</span>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{formatBytes(file.file_size)}</td>
                        <td><span className="badge badge-version">v{file.version}</span></td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {isSharedWithMeView ? (file.shared_by || file.owner_name || 'System Admin') : file.owner_name}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {isSharedWithMeView && file.shared_at
                            ? new Date(file.shared_at).toLocaleDateString()
                            : file.upload_time ? new Date(file.upload_time).toLocaleDateString() : '-'}
                        </td>
                        <td>
                          {isSharedWithMeView ? (
                            <span className="badge" style={{ background: file.permission === 'editor' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: file.permission === 'editor' ? 'var(--purple)' : 'var(--primary)' }}>
                              {file.permission ? file.permission.toUpperCase() : 'SHARED'}
                            </span>
                          ) : file.is_locked ? (
                            <span className="badge badge-locked"><Lock size={12} style={{ display: 'inline', marginRight: '3px' }} /> Locked</span>
                          ) : (
                            <span className="badge badge-unlocked"><Unlock size={12} style={{ display: 'inline', marginRight: '3px' }} /> Open</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                            <button className="btn btn-secondary" style={{ padding: '0.35rem' }} onClick={() => setPreviewFile(file)} title="File Info & SHA256">
                              <Info size={14} />
                            </button>
                            <button className="btn btn-secondary" style={{ padding: '0.35rem', color: 'var(--success)' }} onClick={() => handleSingleDownload(file)} title="Download File">
                              <Download size={14} />
                            </button>

                            {user && user.role === 'admin' && (
                              <button className="btn btn-secondary" style={{ padding: '0.35rem', color: 'var(--purple)' }} onClick={() => setShareTarget({ item: file, isFolder: false })} title="Share File">
                                <Share2 size={14} />
                              </button>
                            )}

                            {isEditor && (
                              <>
                                <button className="btn btn-secondary" style={{ padding: '0.35rem' }} onClick={() => setRenameTargetItem({ type: 'file', item: file })} title="Rename File">
                                  <Edit3 size={14} />
                                </button>
                                {isOwnerOrAdmin && (
                                  <>
                                    <button className="btn btn-secondary" style={{ padding: '0.35rem' }} onClick={() => handleToggleFileLock(file)} title="Lock/Unlock File">
                                      {file.is_locked ? <Unlock size={14} /> : <Lock size={14} />}
                                    </button>
                                    <button className="btn btn-secondary" style={{ padding: '0.35rem', color: 'var(--danger)' }} onClick={() => handleDeleteFile(file)} title="Delete File">
                                      <Trash2 size={14} />
                                    </button>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <FilePreviewModal
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
      />

      <FolderPreviewModal
        folder={previewFolder}
        isOpen={!!previewFolder}
        onClose={() => setPreviewFolder(null)}
      />

      <ShareDialog
        item={shareTarget?.item}
        isFolder={shareTarget?.isFolder}
        isOpen={!!shareTarget}
        onClose={() => setShareTarget(null)}
        onShare={shareItem}
        onRevoke={revokeShare}
      />

      <RenameModal
        file={renameTargetItem?.item ? { id: renameTargetItem.item.id, original_filename: renameTargetItem.item.name || renameTargetItem.item.original_filename, type: renameTargetItem.type } : null}
        isOpen={!!renameTargetItem}
        onClose={() => setRenameTargetItem(null)}
        onRename={handleRenameSubmit}
        isShared={isSharedWithMeView || (renameTargetItem?.item && renameTargetItem.item.owner_id !== user?.id)}
      />
    </div>
  );
};

export default FileListTable;
