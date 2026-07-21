# MinIO Object Storage Setup Guide (Community Edition)

This enterprise network file server uses **MinIO Object Storage** as its dedicated object storage layer. All uploaded files are stored inside the `fileserver-storage` bucket.

---

## ⚡ Quick Start Options

### Option 1: Running MinIO Standalone Executable on Windows (Recommended)

1. **Download MinIO Binary**:
   Open PowerShell or Command Prompt and download `minio.exe`:
   ```cmd
   curl -O https://dl.min.io/server/minio/release/windows-amd64/minio.exe
   ```

2. **Create Data Storage Directory**:
   ```cmd
   mkdir C:\minio-data
   ```

3. **Start MinIO Server**:
   ```cmd
   minio.exe server C:\minio-data --console-address ":9001"
   ```

4. **Verify MinIO Access**:
   - **MinIO S3 API Endpoint**: `http://127.0.0.1:9000`
   - **MinIO Admin Web Console**: `http://127.0.0.1:9001`
   - **Default Credentials**: `minioadmin` / `minioadmin`

---

### Option 2: Running MinIO Container with Docker

If Docker Desktop is installed, run:

```bash
docker run -d \
  --name minio-server \
  -p 9000:9000 \
  -p 9001:9001 \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  minio/minio server /data --console-address ":9001"
```

---

## ⚙️ Environment Configuration (`server/.env`)

Ensure your `server/.env` file contains the following parameters:

```env
# MinIO Object Storage Configuration
MINIO_ENDPOINT=127.0.0.1
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=fileserver-storage
```

---

## 🛡️ Health & Storage Server Offline Resilience

- The backend automatically initializes and verifies the `fileserver-storage` bucket on server boot.
- If MinIO Server is offline or unreachable, the Admin Dashboard displays **`Storage Server Offline`** without backend crashes.
