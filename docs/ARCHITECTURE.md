# System Architecture & Component Design

## High-Level Client-Server Architecture

```mermaid
graph TD
    subgraph Desktop Client Layer (Electron GUI)
        ElectronShell["Electron Desktop Shell (Main Process)"]
        ReactUI["React Dark-Theme UI (Renderer Process)"]
        SocketClient["Socket.IO Client (Realtime Listener)"]
        AxiosClient["Axios HTTP Client"]
    end

    subgraph Network Layer (LAN)
        HTTPConnection["REST API Over HTTP (Port 5000)"]
        WebSocketConnection["WebSocket / Socket.IO Events"]
    end

    subgraph Backend Server Layer (Express Node.js)
        ExpressServer["Express HTTP Server (0.0.0.0:5000)"]
        SocketIOServer["Socket.IO Server"]
        
        subgraph Middlewares
            AuthMW["JWT Auth Middleware"]
            UploadMW["Multer Upload Middleware"]
            LockMW["File Lock Enforcer"]
            PathMW["Path Traversal Defender"]
            HelmetMW["Helmet & CORS Security"]
        end

        subgraph Core Modules & Services
            AuthService["Authentication Module (bcrypt + JWT)"]
            FileService["File Operations Service"]
            HashService["SHA-256 Checksum Generator"]
            VersionService["File Versioning Handler"]
            LockService["Concurrent Lock Registry"]
            AuditService["Audit Logger"]
        end

        subgraph Repositories & Data Access
            UserRepo["User Repository"]
            FileRepo["File Repository"]
            AuditRepo["Audit Repository"]
        end
      
        StorageManager["Server Physical Storage (/server/storage/)"]
    end

    subgraph Database Layer
        PostgreSQL[("PostgreSQL Database (Users, Files, AuditLogs)")]
    end

    ReactUI --> AxiosClient
    ReactUI --> SocketClient
    AxiosClient --> HTTPConnection
    SocketClient --> WebSocketConnection
    HTTPConnection --> ExpressServer
    WebSocketConnection --> SocketIOServer
    
    ExpressServer --> Middlewares
    Middlewares --> Core Modules & Services
    Core Modules & Services --> Repositories & Data Access
    Core Modules & Services --> StorageManager
    Repositories & Data Access --> PostgreSQL
```

## Security & Protection Layers

1. **Strict Path Traversal Protection**: Every file access verifies that resolved absolute file paths reside inside `/server/storage/`.
2. **Password Security**: Passwords salted and hashed with `bcryptjs`.
3. **Role-Based Access Control (RBAC)**: Admin role can view all users, view all files, delete any file, and view global audit logs. User role is strictly isolated to own files.
4. **File Locking**: Locks files being read/edited to prevent deletion by other users.
