-- PostgreSQL Schema for Enterprise File Server System (With Folder Hierarchy & Metadata Sharing)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    is_disabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. FOLDERS TABLE
CREATE TABLE IF NOT EXISTS folders (
    id VARCHAR(36) PRIMARY KEY,
    owner_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    relative_path VARCHAR(500) NOT NULL,
    parent_folder VARCHAR(500) DEFAULT 'ROOT',
    depth INTEGER DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,
    is_locked BOOLEAN DEFAULT FALSE,
    locked_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    locked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_folders_owner_id ON folders(owner_id);
CREATE INDEX IF NOT EXISTS idx_folders_relative_path ON folders(relative_path);
CREATE INDEX IF NOT EXISTS idx_folders_parent_folder ON folders(parent_folder);

-- 3. FILES TABLE
CREATE TABLE IF NOT EXISTS files (
    id VARCHAR(36) PRIMARY KEY,
    owner_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    folder_id VARCHAR(36) REFERENCES folders(id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL UNIQUE,
    path VARCHAR(500) NOT NULL,
    relative_path VARCHAR(500) DEFAULT '',
    parent_folder VARCHAR(500) DEFAULT 'ROOT',
    depth INTEGER DEFAULT 0,
    file_size BIGINT NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    upload_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1,
    is_locked BOOLEAN DEFAULT FALSE,
    locked_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    locked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_files_owner_id ON files(owner_id);
CREATE INDEX IF NOT EXISTS idx_files_folder_id ON files(folder_id);
CREATE INDEX IF NOT EXISTS idx_files_file_hash ON files(file_hash);

-- 4. SHARED FOLDERS TABLE
CREATE TABLE IF NOT EXISTS shared_folders (
    id VARCHAR(36) PRIMARY KEY,
    folder_id VARCHAR(36) NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    owner_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_with_user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(50) NOT NULL DEFAULT 'viewer' CHECK (permission IN ('viewer', 'editor')),
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(folder_id, shared_with_user_id)
);

CREATE INDEX IF NOT EXISTS idx_shared_folders_user ON shared_folders(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_shared_folders_folder ON shared_folders(folder_id);

-- 5. SHARED FILES TABLE
CREATE TABLE IF NOT EXISTS shared_files (
    id VARCHAR(36) PRIMARY KEY,
    file_id VARCHAR(36) NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    owner_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_with_user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(50) NOT NULL DEFAULT 'viewer' CHECK (permission IN ('viewer', 'editor')),
    inherited_from_folder VARCHAR(36) REFERENCES folders(id) ON DELETE CASCADE,
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(file_id, shared_with_user_id)
);

CREATE INDEX IF NOT EXISTS idx_shared_files_user ON shared_files(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_shared_files_file ON shared_files(file_id);

-- 6. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    filename VARCHAR(255),
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- 7. QR SESSIONS TABLE
CREATE TABLE IF NOT EXISTS qr_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    last_accessed TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_qr_sessions_user_id ON qr_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_sessions_token ON qr_sessions(session_token);
