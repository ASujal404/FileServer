const path = require('path');

module.exports = {
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET || 'super-secret-enterprise-key-2026',
  JWT_EXPIRES_IN: '24h',
  
  // Storage paths
  STORAGE_DIR: path.join(__dirname, '../storage'),
  LOGS_DIR: path.join(__dirname, '../logs'),
  
  // MinIO Object Storage Configuration
  MINIO_ENDPOINT: process.env.MINIO_ENDPOINT || '127.0.0.1',
  MINIO_PORT: parseInt(process.env.MINIO_PORT || '9000', 10),
  MINIO_USE_SSL: process.env.MINIO_USE_SSL === 'true',
  MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY || 'minioadmin',
  MINIO_BUCKET: process.env.MINIO_BUCKET || 'fileserver-storage',
  
  // File Upload Constraints
  MAX_FILE_SIZE: 500 * 1024 * 1024, // 500 MB limit per file
  ALLOWED_EXTENSIONS: [
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.md',
    '.zip', '.tar', '.gz', '.7z', '.rar',
    '.mp3', '.wav', '.mp4', '.mkv', '.avi',
    '.json', '.xml', '.html', '.css', '.js'
  ],
  
  // Roles
  ROLES: {
    ADMIN: 'admin',
    USER: 'user'
  },
  
  // Actions for Audit Logs
  AUDIT_ACTIONS: {
    REGISTER: 'REGISTER',
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',
    UPLOAD: 'UPLOAD',
    DOWNLOAD: 'DOWNLOAD',
    RENAME: 'RENAME',
    DELETE: 'DELETE',
    SEARCH: 'SEARCH',
    LOCK: 'LOCK',
    UNLOCK: 'UNLOCK'
  }
};
