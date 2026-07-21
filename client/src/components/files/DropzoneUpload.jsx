import React, { useState, useContext, useRef } from 'react';
import { StorageContext } from '../../context/StorageContext';
import { UploadCloud, FolderPlus, CheckCircle, AlertTriangle, Trash2, FileText, Layers } from 'lucide-react';

const DropzoneUpload = () => {
  const { uploadFiles, uploadFolder, uploadQueue, clearUploadQueue } = useContext(StorageContext);
  const [isDragOver, setIsDragOver] = useState(false);
  const [duplicateAlerts, setDuplicateAlerts] = useState([]);
  const [uploadError, setUploadError] = useState('');

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  // Drag and drop recursive directory scanner
  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    setUploadError('');
    setDuplicateAlerts([]);

    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    const filesArray = [];
    const relativePaths = [];

    const scanEntry = async (entry, currentPath = '') => {
      if (entry.isFile) {
        return new Promise((resolve) => {
          entry.file((file) => {
            filesArray.push(file);
            relativePaths.push(currentPath ? `${currentPath}/${file.name}` : file.name);
            resolve();
          });
        });
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        return new Promise((resolve) => {
          reader.readEntries(async (entries) => {
            for (const subEntry of entries) {
              await scanEntry(subEntry, currentPath ? `${currentPath}/${entry.name}` : entry.name);
            }
            resolve();
          });
        });
      }
    };

    const promises = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.webkitGetAsEntry) {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          promises.push(scanEntry(entry));
        }
      }
    }

    await Promise.all(promises);

    if (filesArray.length > 0) {
      // If folder structure detected
      const isFolder = relativePaths.some(p => p.includes('/'));
      if (isFolder) {
        await executeFolderUpload(filesArray, relativePaths);
      } else {
        await executeFilesUpload(filesArray);
      }
    }
  };

  const handleFileSelect = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      await executeFilesUpload(e.target.files);
    }
  };

  const handleFolderSelect = async (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const filesArray = Array.from(files);
      const relativePaths = filesArray.map(f => f.webkitRelativePath || f.name);
      await executeFolderUpload(filesArray, relativePaths);
    }
  };

  const executeFilesUpload = async (files) => {
    try {
      const res = await uploadFiles(files);
      if (res && res.duplicates && res.duplicates.length > 0) {
        setDuplicateAlerts(res.duplicates);
      }
    } catch (err) {
      setUploadError(err.response?.data?.error || err.message || 'File upload failed');
    }
  };

  const executeFolderUpload = async (filesArray, relativePaths) => {
    try {
      const res = await uploadFolder(filesArray, relativePaths);
      if (res && res.duplicates && res.duplicates.length > 0) {
        setDuplicateAlerts(res.duplicates);
      }
    } catch (err) {
      setUploadError(err.response?.data?.error || err.message || 'Folder upload failed');
    }
  };

  return (
    <div>
      <div
        className={`dropzone ${isDragOver ? 'active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          style={{ display: 'none' }}
        />

        <input
          type="file"
          ref={folderInputRef}
          onChange={handleFolderSelect}
          webkitdirectory="true"
          directory="true"
          multiple
          style={{ display: 'none' }}
        />

        <div style={{ display: 'inline-flex', padding: '1.25rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', color: 'var(--primary)', marginBottom: '1rem' }}>
          <UploadCloud size={40} />
        </div>

        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.4rem' }}>
          Drag & Drop Files or Complete Folders Here
        </h3>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          Recursively preserves complete directory trees, relative paths, and folder hierarchy.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
          >
            <UploadCloud size={16} /> Select Files
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ color: 'var(--warning)', borderColor: 'var(--warning)' }}
            onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}
          >
            <FolderPlus size={16} /> Select Folder (Recursive)
          </button>
        </div>
      </div>

      {/* Duplicate Alert Banner */}
      {duplicateAlerts.length > 0 && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid var(--warning)', borderRadius: '8px', color: 'var(--warning)' }}>
          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <AlertTriangle size={18} /> Duplicate Files Detected
          </div>
          {duplicateAlerts.map((d, i) => (
            <div key={i} style={{ fontSize: '0.85rem', marginLeft: '1.5rem' }}>
              • {d.message}
            </div>
          ))}
        </div>
      )}

      {/* Upload Error Banner */}
      {uploadError && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)', borderRadius: '8px', color: 'var(--danger)', fontSize: '0.9rem' }}>
          {uploadError}
        </div>
      )}

      {/* Upload Queue Section */}
      {uploadQueue.length > 0 && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <div className="card-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} /> Upload Queue & Folder Progress ({uploadQueue.length})
            </span>
            <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={clearUploadQueue}>
              <Trash2 size={14} /> Clear Queue
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {uploadQueue.map((item) => (
              <div key={item.id} style={{ background: 'var(--bg-darker)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  <span style={{ fontWeight: 500 }}>{item.name}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {(item.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>

                <div className="progress-bar-bg">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${item.progress}%`,
                      backgroundColor: item.status === 'error' ? 'var(--danger)' : item.status === 'completed' ? 'var(--success)' : 'var(--primary)'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>{item.status === 'completed' ? 'Uploaded Successfully' : item.status === 'error' ? item.error || 'Failed' : `${item.progress}%`}</span>
                  {item.status === 'completed' && <CheckCircle size={14} style={{ color: 'var(--success)' }} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DropzoneUpload;
