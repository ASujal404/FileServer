# Project Folder Structure

```
c:/FileServerProject/
├── client/                     # Desktop GUI App (Electron + React)
│   ├── package.json            # Dependencies & Electron build scripts
│   ├── vite.config.js          # Vite build bundler configuration
│   ├── electron-builder.json   # Packaging configuration (EXE, AppImage)
│   ├── index.html              # HTML DOM entry
│   ├── electron/
│   │   ├── main.js             # Electron main process
│   │   └── preload.js          # Secure IPC contextBridge bridge
│   └── src/
│       ├── main.jsx            # React root renderer
│       ├── App.jsx             # Main application layout
│       ├── styles/
│       │   └── index.css       # Dark theme CSS tokens & UI styling
│       ├── context/
│       │   ├── AuthContext.jsx   # Authentication state management
│       │   ├── SocketContext.jsx # Realtime LAN socket connection
│       │   └── StorageContext.jsx# File list & upload queue management
│       ├── services/
│       │   └── api.js          # Axios REST client with dynamic LAN IP
│       └── components/
│           ├── layout/         # Navbar, Sidebar, ServerConfigModal
│           ├── auth/           # Login, Register
│           ├── files/          # FileListTable, DropzoneUpload, FilePreviewModal, RenameModal
│           └── admin/          # AdminDashboard, AuditLogViewer
│
├── server/                     # Backend Express REST API Server
│   ├── package.json            # Server dependencies
│   ├── server.js               # Entry point (HTTP + Socket.IO server 0.0.0.0:5000)
│   ├── config/
│   │   ├── db.js               # PostgreSQL pool connection
│   │   └── constants.js        # File limits, JWT secrets, path configs
│   ├── database/
│   │   ├── schema.sql          # PostgreSQL DDL script (users, files, audit_logs)
│   │   ├── initDb.js           # Database migration & admin seeder
│   │   └── fallbackDb.js       # Fallback store when PostgreSQL is offline
│   ├── middlewares/
│   │   ├── auth.middleware.js  # JWT verification & RBAC check
│   │   ├── upload.middleware.js# Multer upload & extension filter
│   │   ├── lock.middleware.js  # File lock delete blocker
│   │   ├── pathSanitizer.js   # Path traversal protection
│   │   └── errorHandler.js    # Global error handler
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── file.controller.js
│   │   ├── storage.controller.js
│   │   ├── audit.controller.js
│   │   └── admin.controller.js
│   ├── repositories/           # Dual PostgreSQL & Fallback Data Access
│   │   ├── user.repository.js
│   │   ├── file.repository.js
│   │   └── audit.repository.js
│   ├── services/
│   │   ├── hash.service.js       # SHA-256 calculation
│   │   ├── versioning.service.js # v1, v2, v3 versioning logic
│   │   └── lock.service.js       # File locking state manager
│   ├── routes/                 # Express API routes
│   │   ├── auth.routes.js
│   │   ├── file.routes.js
│   │   ├── storage.routes.js
│   │   ├── audit.routes.js
│   │   └── admin.routes.js
│   ├── storage/                # Server physical file storage directory
│   └── logs/                   # System & Audit log files
│
└── docs/                       # Comprehensive Architecture & Documentation
    ├── ARCHITECTURE.md         # Architecture component diagram
    ├── API_DOCUMENTATION.md    # REST API specification
    ├── DATABASE_SCHEMA.md      # PostgreSQL ER diagram & data dictionary
    ├── SEQUENCE_DIAGRAMS.md    # Upload, download & lock sequence diagrams
    ├── DEPLOYMENT_GUIDE.md     # Enterprise LAN deployment guide
    ├── INSTALLATION_GUIDE.md   # Step-by-step setup guide
    ├── PACKAGING_GUIDE.md      # Electron builder packaging guide
    ├── TESTING_INSTRUCTIONS.md # Manual feature verification steps
    └── FOLDER_STRUCTURE.md     # Directory structure tree
```
