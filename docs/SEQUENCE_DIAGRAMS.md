# System Sequence Diagrams

## 1. File Upload & SHA-256 Duplicate / Versioning Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Client as Desktop Client (Electron)
    participant Server as Express Server
    participant Multer as Multer Upload MW
    participant Hash as SHA-256 Service
    participant Version as Versioning Service
    participant Repo as File Repository
    participant Storage as Disk Storage
    participant Socket as Socket.IO Hub

    Client->>Server: POST /upload (Files, Multipart, Bearer Token)
    Server->>Multer: Stream Files
    Multer->>Storage: Save physical file with UUID name
    Multer-->>Server: Files written
    Server->>Hash: Calculate SHA-256 Hash
    Hash-->>Server: Hash Checksum
    Server->>Repo: Check for duplicate hash
    Repo-->>Server: Existing duplicate records (if any)
    Server->>Version: Check max version for (owner, original_filename)
    Version-->>Server: Calculated Version (e.g. v2 -> resume_v2.pdf)
    Server->>Repo: INSERT file record
    Server->>Socket: Broadcast 'file:uploaded' event
    Server-->>Client: 201 Created (File metadata + Duplicate alerts)
```

## 2. Resumable File Download & HTTP Range Request Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Client as Desktop Client
    participant Server as Express Server
    participant Auth as Auth Middleware
    participant Repo as File Repository
    participant Storage as File Storage

    Client->>Server: GET /download/:id (Range: bytes=0-1048576)
    Server->>Auth: Validate JWT Token
    Auth-->>Server: User Context
    Server->>Repo: Find file by ID
    Repo-->>Server: File Metadata
    Server->>Storage: Verify physical file path & size
    Server-->>Client: 206 Partial Content (Content-Range: bytes 0-1048576/fileSize)
```

## 3. File Locking & Delete Blocker Sequence

```mermaid
sequenceDiagram
    autonumber
    actor UserA as User A (Editor)
    actor UserB as User B (Attacker/Other User)
    participant Server as Express Server
    participant LockMW as File Lock Middleware
    participant Repo as File Repository

    UserA->>Server: POST /files/:id/lock
    Server->>Repo: Set is_locked = true, locked_by = UserA
    Server-->>UserA: 200 OK (File Locked)

    UserB->>Server: DELETE /delete/:id
    Server->>LockMW: Check File Lock State
    LockMW->>Repo: Find File State
    Repo-->>LockMW: is_locked = true, locked_by = UserA
    LockMW-->>UserB: 423 Locked ("This file is currently locked by another user.")
```
