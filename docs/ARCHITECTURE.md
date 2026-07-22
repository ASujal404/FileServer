# System Architecture & Component Design

## High-Level Client-Server Architecture

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
        SocketHub["Socket.IO Realtime Hub<br/>• Realtime Updates<br/>• Notifications<br/>• File Status Synchronization"]:::serverModule
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


## Security & Protection Layers

1. **Strict Path Traversal Protection**: Every file access verifies that resolved absolute file paths reside inside `/server/storage/`.
2. **Password Security**: Passwords salted and hashed with `bcryptjs`.
3. **Role-Based Access Control (RBAC)**: Admin role can view all users, view all files, delete any file, and view global audit logs. User role is strictly isolated to own files.
4. **File Locking**: Locks files being read/edited to prevent deletion by other users.
