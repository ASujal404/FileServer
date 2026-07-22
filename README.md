# Production Network File Server System

Enterprise-level, cross-platform GUI File Server System built with **Electron**, **React**, **Node.js/Express**, **PostgreSQL**, and **Socket.IO**. Designed for reliable multi-user access over Local Area Networks (LAN) with robust file operations, security, automatic SHA-256 duplicate detection, file versioning, file locking, and real-time audit logging.

---

## 🌟 Key Features Matrix

- **Client-Server LAN Architecture**: Desktop client connects to Express backend listening on `0.0.0.0:5000` via REST APIs and WebSockets.
- **Authentication & RBAC**: Password hashing using `bcryptjs`, JWT session tokens, and strict role permissions:
  - **Admin**: Manage storage capacity, view all users, delete any file, view full system audit logs.
  - **User**: Isolated visibility to own files, upload, download, rename, and lock own files.
- **Drag & Drop Upload Queue**: Multi-file drag and drop dropzone with individual progress bars.
- **SHA-256 Checksum Duplicate Detection**: Generates SHA-256 hash on upload and alerts user if identical content already exists.
- **Automatic File Versioning**: Uploading files with duplicate names automatically maintains version history (`resume.pdf` ➔ `resume_v2.pdf` ➔ `resume_v3.pdf`).
- **Resumable HTTP Range Downloads & Zip Archive**: Supports single file download with HTTP `Range` resumption and multi-file zip archiving.
- **Concurrent File Locking**: Prevents file modification/deletion when locked: Displays `"This file is currently locked by another user."`
- **Real-Time LAN Updates**: Socket.IO broadcasts live file additions, lock state changes, and audit logs.
- **MinIO Object Storage**: Replaced server local storage with enterprise MinIO object storage for PDFs, images, documents, and other object types.
- **QR Mobile Access**: JWT-based QR sessions allow scanning, authentication, and file viewing/downloading on mobile web browsers.
- **Minimal Dark Theme UI**: High contrast, responsive dashboard focused on system utility and file management.

---

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| **Desktop Client** | Electron, React, Vite, Lucide Icons |
| **Mobile Client** | Mobile Web Browser (QR Access) |
| **Packaging** | Electron Builder (Windows `.exe`, Linux `AppImage`) |
| **Backend API** | Node.js, Express.js |
| **Database** | PostgreSQL (with auto-migrating `schema.sql`) |
| **Object Storage** | MinIO Object Storage |
| **Authentication** | JWT, bcryptjs, Role Based Access Control |
| **Realtime Communication** | Socket.IO (Realtime Updates, File Status Sync) |
| **File Upload** | Multer |
| **Archive Bundler** | Archiver |

---

## 🚀 Quick Start Guide

### 1. Start Backend Server

```bash
cd server
npm install
npm start
```
*The server automatically initializes database schema and listens on `http://0.0.0.0:5000`.*

### 2. Start Desktop Client Application

```bash
cd client
npm install
npm run electron:dev
```

### 🔑 Default Credentials

- **Admin User**: `admin@fileserver.com`
- **Password**: `Admin@123`

---

## 📐 System Architecture Diagram

```mermaid
%%{init: {
  'theme': 'dark',
  'themeVariables': {
    'background': '#0f172a',
    'primaryColor': '#1e293b',
    'primaryTextColor': '#f8fafc',
    'primaryBorderColor': '#38bdf8',
    'lineColor': '#64748b',
    'secondaryColor': '#1e293b',
    'tertiaryColor': '#0f172a',
    'fontSize': '13px'
  }
}}%%
graph TD
    %% Styling Classes
    classDef clientLayer fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#e0e7ff;
    classDef serverCore fill:#0f172a,stroke:#38bdf8,stroke-width:3px,color:#f8fafc,font-weight:bold;
    classDef serverModule fill:#1e293b,stroke:#475569,stroke-width:1px,color:#cbd5e1;
    classDef databaseLayer fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#ecfdf5;
    classDef storageLayer fill:#7c2d12,stroke:#fb923c,stroke-width:2px,color:#fff7ed;
    classDef mobileLayer fill:#581c87,stroke:#c084fc,stroke-width:2px,color:#f3e8ff;

    %% LAYER 1: Electron Desktop GUI
    subgraph T1 ["Tier 1: Desktop Interface"]
        DesktopGUI["Electron Desktop GUI<br/>(React UI + Axios + Socket.IO Client)"]:::clientLayer
    end

    %% LAYER 2: Express REST Server (Center of Architecture)
    subgraph T2 ["Tier 2: API & Application Logic"]
        ExpressServer["Express REST Server<br/>(Node.js / Express.js Core)"]:::serverCore
        
        AuthModule["JWT Authentication Module<br/>• JWT<br/>• bcrypt<br/>• Role Based Authentication"]:::serverModule
        LockEngine["File Lock Engine<br/>• Concurrency Control"]:::serverModule
        SocketHub["Socket.IO Realtime Hub<br/>• Realtime Updates<br/>• File Status Synchronization"]:::serverModule
    end

    %% LAYER 3: PostgreSQL Database (Metadata)
    subgraph T3 ["Tier 3: Relational Metadata Store"]
        PostgresDB[("PostgreSQL Database<br/>• Users<br/>• File Metadata<br/>• QR Sessions<br/>• Shared Files<br/>• Shared Folders<br/>• Audit Logs")]:::databaseLayer
    end

    %% LAYER 4: MinIO Object Storage (Actual Files)
    subgraph T4 ["Tier 4: Object Storage Pool"]
        MinIOStorage[("MinIO Object Storage<br/>• PDF Files<br/>• Images<br/>• Documents<br/>• Object Storage")]:::storageLayer
    end

    %% LAYER 5: QR Mobile Access
    subgraph T5 ["Tier 5: Mobile Access Layer"]
        QR_Mobile["QR Mobile Client<br/>(Mobile Browser)<br/>─────────────────────<br/>Scan QR<br/>↓<br/>Authenticate QR Session<br/>↓<br/>View Files<br/>↓<br/>Download Files"]:::mobileLayer
    end

    %% Apply structural styling/classes
    class DesktopGUI clientLayer;
    class ExpressServer serverCore;
    class PostgresDB databaseLayer;
    class MinIOStorage storageLayer;
    class QR_Mobile mobileLayer;

    %% --- CONNECTIONS ---
    %% 1. Electron Desktop GUI to Express REST Server
    DesktopGUI -->|"REST API Requests / Socket.IO Connection"| ExpressServer

    %% 2. Express Server Core Module Communication
    ExpressServer <-->|"Verify Credentials & Roles"| AuthModule
    ExpressServer <-->|"Lock / Unlock Files"| LockEngine
    ExpressServer <-->|"Push Event Updates"| SocketHub

    %% 3. Express Server Persistence Communication
    ExpressServer <-->|"Query & Manage Metadata"| PostgresDB
    ExpressServer <-->|"Read & Write Objects"| MinIOStorage

    %% 4. QR Mobile Client Connection to Express Server
    QR_Mobile -->|"Scan, Authenticate & Download"| ExpressServer

    %% 5. PRIMARY DATA & ACCESS FLOW (Electron -> Server -> Postgres -> MinIO -> Mobile)
    DesktopGUI ==> ExpressServer
    ExpressServer ==> PostgresDB
    PostgresDB ==> MinIOStorage
    MinIOStorage ==> QR_Mobile

    %% Link Styles to highlight primary architectural flow
    linkStyle 7,8,9,10 stroke:#38bdf8,stroke-width:4px,stroke-dasharray: 5 5;
```

---

## 📚 Complete Project Documentation

Detailed technical documents are available in the `docs/` folder:

- 🏗️ [Architecture & Component Specifications](file:///c:/FileServerProject/docs/ARCHITECTURE.md)
- 🗄️ [Database ER Diagram & Schema Reference](file:///c:/FileServerProject/docs/DATABASE_SCHEMA.md)
- 🔄 [Sequence Diagrams (Upload, Resumable Download, Locking)](file:///c:/FileServerProject/docs/SEQUENCE_DIAGRAMS.md)
- 🔌 [REST API Documentation](file:///c:/FileServerProject/docs/API_DOCUMENTATION.md)
- 📦 [Electron Packaging Guide (EXE & AppImage)](file:///c:/FileServerProject/docs/PACKAGING_GUIDE.md)
- 🌐 [LAN Network Deployment Guide](file:///c:/FileServerProject/docs/DEPLOYMENT_GUIDE.md)
- 🧪 [Verification & Testing Instructions](file:///c:/FileServerProject/docs/TESTING_INSTRUCTIONS.md)
- 📁 [Folder Structure Reference](file:///c:/FileServerProject/docs/FOLDER_STRUCTURE.md)

  
