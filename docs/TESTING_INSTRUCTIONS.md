# Verification & Testing Instructions

Follow these steps to test and verify all core file server requirements:

---

## 1. Authentication & Role Testing
1. Register a new standard user (`user1@domain.com`).
2. Verify user dashboard view only shows files owned by `user1`.
3. Log out and sign in as default Admin (`admin@fileserver.com` / `Admin@123`).
4. Verify Admin panel displays system metrics, user list, and global files.

---

## 2. File Operations & SHA-256 Duplicate Check
1. Drag and drop a file (`document.pdf`) into the upload dropzone.
2. Upload the exact same file again.
3. Verify that:
   - System automatically generates a version increment (`document_v2.pdf`).
   - Warning notification appears alerting SHA-256 duplicate content detection.

---

## 3. Resumable HTTP Range & Batch Download Verification
1. Download a single file using the download action.
2. Select multiple files using table checkboxes and click **Batch Zip**.
3. Confirm `.zip` archive downloads containing selected files.

---

## 4. Concurrent File Locking Verification
1. Click the **Lock** button on a file using User 1.
2. Log into another session or account (User 2).
3. Attempt to delete or modify the locked file.
4. Verify error prompt: `"This file is currently locked by another user."`

---

## 5. Audit Log Inspection
1. Open **Audit Logs** tab.
2. Verify timestamps, user names, action codes (`LOGIN`, `UPLOAD`, `LOCK`, `DELETE`), and details are displayed in real-time.
