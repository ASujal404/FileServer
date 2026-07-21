# REST API Reference Documentation

Base URL: `http://<SERVER_IP>:5000`

---

## Authentication Endpoints

### 1. Register Account
- **Endpoint**: `POST /register`
- **Auth**: None
- **Body**:
  ```json
  {
    "name": "Alice Smith",
    "email": "alice@domain.com",
    "password": "Password123",
    "role": "user"
  }
  ```

### 2. Login
- **Endpoint**: `POST /login`
- **Auth**: None
- **Body**:
  ```json
  {
    "email": "admin@fileserver.com",
    "password": "Admin@123"
  }
  ```

---

## Enterprise Metadata Sharing Endpoints (NEW)

### 3. Share Folder Recursively
- **Endpoint**: `POST /share/folder`
- **Auth**: Bearer Token
- **Body**:
  ```json
  {
    "folderId": "folder-uuid",
    "targetUserIds": ["user-uuid-1", "user-uuid-2"],
    "permission": "viewer"
  }
  ```
- **Description**: Creates metadata share records in `shared_folders` and `shared_files` for target users. Automatically cascades down all subfolders and nested files with `inherited_from_folder`. Zero physical file duplication.

### 4. Share Single File
- **Endpoint**: `POST /share/file`
- **Auth**: Bearer Token
- **Body**:
  ```json
  {
    "fileId": "file-uuid",
    "targetUserIds": ["user-uuid-1"],
    "permission": "editor"
  }
  ```

### 5. Fetch "Shared With Me" Items
- **Endpoint**: `GET /shared-with-me`
- **Auth**: Bearer Token
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "folders": [ ... ],
    "files": [ ... ]
  }
  ```

### 6. Revoke Share Access
- **Endpoint**: `DELETE /share/folder/:folderId/user/:targetUserId`
- **Endpoint**: `DELETE /share/file/:fileId/user/:targetUserId`
- **Auth**: Bearer Token

### 7. Get Users Currently Granted Share Access
- **Endpoint**: `GET /share/users/:itemId?isFolder=true`
- **Auth**: Bearer Token

---

## Folder & Directory Endpoints

### 8. Upload Recursive Folder Structure
- **Endpoint**: `POST /upload-folder`
- **Auth**: Bearer Token

### 9. Download Compressed Folder ZIP Archive
- **Endpoint**: `GET /download/folder/:id`
- **Auth**: Bearer Token

---

## File Operation Endpoints

### 10. List Files
- **Endpoint**: `GET /files`

### 11. Download Single File (Resumable Range Support)
- **Endpoint**: `GET /download/:id`
