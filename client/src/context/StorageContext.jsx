import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from './AuthContext';
import { SocketContext } from './SocketContext';

export const StorageContext = createContext();

export const StorageProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);

  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [sharedFolders, setSharedFolders] = useState([]);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [currentPath, setCurrentPath] = useState('');
  const [storageStats, setStorageStats] = useState({
    totalBytes: 0,
    usedBytes: 0,
    availableBytes: 0,
    usedPercentage: 0,
    fileCount: 0,
    userCount: 0
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [extensionFilter, setExtensionFilter] = useState('');
  const [sortField, setSortField] = useState('upload_time');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    if (user) {
      fetchFiles();
      fetchFolders();
      fetchSharedWithMe();
      fetchStorageStats();
    }
  }, [user]);

  // Socket.IO real-time event listeners
  useEffect(() => {
    if (!socket || !user) return;

    const handleDataChange = () => {
      fetchFiles();
      fetchFolders();
      fetchSharedWithMe();
      fetchStorageStats();
    };

    socket.on('file:uploaded', handleDataChange);
    socket.on('file:deleted', handleDataChange);
    socket.on('file:renamed', handleDataChange);
    socket.on('file:locked', handleDataChange);
    socket.on('folder:uploaded', handleDataChange);
    socket.on('folder:deleted', handleDataChange);
    socket.on('folder:renamed', handleDataChange);
    socket.on('folder:locked', handleDataChange);
    socket.on('share:updated', handleDataChange);

    return () => {
      socket.off('file:uploaded', handleDataChange);
      socket.off('file:deleted', handleDataChange);
      socket.off('file:renamed', handleDataChange);
      socket.off('file:locked', handleDataChange);
      socket.off('folder:uploaded', handleDataChange);
      socket.off('folder:deleted', handleDataChange);
      socket.off('folder:renamed', handleDataChange);
      socket.off('folder:locked', handleDataChange);
      socket.off('share:updated', handleDataChange);
    };
  }, [socket, user]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await api.get('/files');
      if (res.data.success) {
        setFiles(res.data.files);
      }
    } catch (err) {
      console.error('[StorageContext] Error fetching files:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    try {
      const res = await api.get('/folders');
      if (res.data.success) {
        setFolders(res.data.folders);
      }
    } catch (err) {
      console.error('[StorageContext] Error fetching folders:', err);
    }
  };

  const fetchSharedWithMe = async () => {
    try {
      const res = await api.get('/shared-with-me');
      if (res.data.success) {
        setSharedFolders(res.data.folders);
        setSharedFiles(res.data.files);
      }
    } catch (err) {
      console.error('[StorageContext] Error fetching shared items:', err);
    }
  };

  const fetchStorageStats = async () => {
    try {
      const res = await api.get('/storage');
      if (res.data.success) {
        setStorageStats(res.data.storage);
      }
    } catch (err) {
      console.error('[StorageContext] Error fetching storage stats:', err);
    }
  };

  const uploadFiles = async (fileList) => {
    const filesArray = Array.from(fileList);
    const newQueueItems = filesArray.map(f => ({
      id: Math.random().toString(36).substr(2, 9),
      name: f.name,
      size: f.size,
      progress: 0,
      status: 'uploading'
    }));

    setUploadQueue(prev => [...newQueueItems, ...prev]);

    const formData = new FormData();
    filesArray.forEach(file => formData.append('files', file));

    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadQueue(prev =>
            prev.map(q => newQueueItems.some(item => item.id === q.id) ? { ...q, progress: percentCompleted } : q)
          );
        }
      });

      if (res.data.success) {
        setUploadQueue(prev =>
          prev.map(q => newQueueItems.some(item => item.id === q.id) ? { ...q, progress: 100, status: 'completed' } : q)
        );
        fetchFiles();
        fetchStorageStats();
        return res.data;
      }
    } catch (err) {
      setUploadQueue(prev =>
        prev.map(q => newQueueItems.some(item => item.id === q.id) ? { ...q, status: 'error', error: err.response?.data?.error || err.message } : q)
      );
      throw err;
    }
  };

  const uploadFolder = async (filesArray, relativePaths) => {
    const totalSize = filesArray.reduce((acc, f) => acc + f.size, 0);
    const rootName = relativePaths[0]?.split('/')[0] || 'Folder';
    const queueId = Math.random().toString(36).substr(2, 9);

    const queueItem = {
      id: queueId,
      name: `📁 Folder: ${rootName} (${filesArray.length} items)`,
      size: totalSize,
      progress: 0,
      status: 'uploading'
    };

    setUploadQueue(prev => [queueItem, ...prev]);

    const formData = new FormData();
    filesArray.forEach(file => formData.append('files', file));
    formData.append('relativePaths', JSON.stringify(relativePaths));

    try {
      const res = await api.post('/upload-folder', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadQueue(prev =>
            prev.map(q => q.id === queueId ? { ...q, progress: percentCompleted } : q)
          );
        }
      });

      if (res.data.success) {
        setUploadQueue(prev =>
          prev.map(q => q.id === queueId ? { ...q, progress: 100, status: 'completed' } : q)
        );
        fetchFiles();
        fetchFolders();
        fetchStorageStats();
        return res.data;
      }
    } catch (err) {
      setUploadQueue(prev =>
        prev.map(q => q.id === queueId ? { ...q, status: 'error', error: err.response?.data?.error || err.message } : q)
      );
      throw err;
    }
  };

  const deleteFile = async (fileId) => {
    const res = await api.delete(`/delete/${fileId}`);
    if (res.data.success) {
      fetchFiles();
      fetchStorageStats();
    }
    return res.data;
  };

  const renameFile = async (fileId, newName) => {
    const res = await api.put(`/rename/${fileId}`, { newName });
    if (res.data.success) {
      fetchFiles();
    }
    return res.data;
  };

  const lockFile = async (fileId) => {
    const res = await api.post(`/files/${fileId}/lock`);
    if (res.data.success) fetchFiles();
    return res.data;
  };

  const unlockFile = async (fileId) => {
    const res = await api.post(`/files/${fileId}/unlock`);
    if (res.data.success) fetchFiles();
    return res.data;
  };

  const downloadFolderZip = async (folderId, folderName) => {
    const res = await api.get(`/download/folder/${folderId}`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${folderName}_${Date.now()}.zip`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renameFolder = async (folderId, newName) => {
    const res = await api.put(`/folders/rename/${folderId}`, { newName });
    if (res.data.success) {
      fetchFolders();
      fetchFiles();
    }
    return res.data;
  };

  const deleteFolder = async (folderId) => {
    const res = await api.delete(`/folders/delete/${folderId}`);
    if (res.data.success) {
      fetchFolders();
      fetchFiles();
      fetchStorageStats();
    }
    return res.data;
  };

  const lockFolder = async (folderId) => {
    const res = await api.post(`/folders/${folderId}/lock`);
    if (res.data.success) fetchFolders();
    return res.data;
  };

  const unlockFolder = async (folderId) => {
    const res = await api.post(`/folders/${folderId}/unlock`);
    if (res.data.success) fetchFolders();
    return res.data;
  };

  // Sharing API Integration
  const shareItem = async ({ itemId, isFolder, targetUserIds, permission }) => {
    const payload = { itemId, isFolder, targetUserIds, permission };
    const res = await api.post('/share', payload);
    if (res.data.success) {
      fetchSharedWithMe();
    }
    return res.data;
  };

  const revokeShare = async ({ itemId, isFolder, targetUserId }) => {
    const res = await api.delete(`/share?itemId=${itemId}&isFolder=${isFolder}&targetUserId=${targetUserId}`);
    if (res.data.success) {
      fetchSharedWithMe();
    }
    return res.data;
  };

  const clearUploadQueue = () => setUploadQueue([]);

  return (
    <StorageContext.Provider
      value={{
        files,
        folders,
        sharedFolders,
        sharedFiles,
        loading,
        uploadQueue,
        storageStats,
        searchQuery,
        setSearchQuery,
        extensionFilter,
        setExtensionFilter,
        sortField,
        setSortField,
        sortOrder,
        setSortOrder,
        currentPath,
        setCurrentPath,
        fetchFiles,
        fetchFolders,
        fetchSharedWithMe,
        uploadFiles,
        uploadFolder,
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
        clearUploadQueue
      }}
    >
      {children}
    </StorageContext.Provider>
  );
};
