const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');
const fileRepository = require('../repositories/file.repository');
const auditRepository = require('../repositories/audit.repository');
const { calculateFileHash } = require('../services/hash.service');
const { processFileVersion } = require('../services/versioning.service');
const lockService = require('../services/lock.service');
const minioService = require('../services/minio.service');
const { sanitizeFilename, verifyPathInStorage } = require('../middlewares/pathSanitizer');
const { AUDIT_ACTIONS, STORAGE_DIR } = require('../config/constants');

function safeUnlink(filePath, retries = 3, delayMs = 300) {
  if (!filePath || !fs.existsSync(filePath)) return;
  try {
    fs.unlinkSync(filePath);
  } catch (err) {
    if ((err.code === 'EBUSY' || err.code === 'EPERM') && retries > 0) {
      setTimeout(() => safeUnlink(filePath, retries - 1, delayMs), delayMs);
    } else {
      console.warn(`[Cleanup Notice] Deferred unlink for '${path.basename(filePath)}': ${err.message}`);
    }
  }
}

class FileController {
  // GET /files
  async getFiles(req, res, next) {
    try {
      const user = req.user;
      let files;

      if (user.role === 'admin') {
        files = await fileRepository.findAll();
      } else {
        files = await fileRepository.findByOwner(user.id);
      }

      return res.status(200).json({
        success: true,
        count: files.length,
        files
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /upload
  async uploadFiles(req, res, next) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, error: 'No files were uploaded.' });
      }

      // If relativePaths payload is present, automatically process as recursive folder upload
      if (req.body && req.body.relativePaths) {
        const folderService = require('../services/folder.service');
        let relativePaths = req.body.relativePaths;
        if (typeof relativePaths === 'string') {
          try { relativePaths = JSON.parse(relativePaths); } catch { relativePaths = [relativePaths]; }
        }
        const result = await folderService.uploadFolder({
          user: req.user,
          files: req.files,
          relativePaths
        });

        if (req.io) {
          req.io.emit('folder:uploaded', {
            folderName: result.rootFolderName,
            uploader: req.user.name
          });
        }

        return res.status(201).json({
          success: true,
          message: `Folder '${result.rootFolderName}' uploaded recursively (${result.fileCount} files).`,
          ...result
        });
      }

      const uploadedResults = [];
      const duplicateWarnings = [];

      for (const file of req.files) {
        const originalFilename = sanitizeFilename(file.originalname);
        const storedFilename = file.filename;
        const targetPath = verifyPathInStorage(file.path);
        const fileSize = file.size;

        // 1. Calculate SHA-256 Hash
        const hash = await calculateFileHash(targetPath);

        // 2. Duplicate Detection for Owner
        const ownerDuplicates = await fileRepository.findByHash(hash, req.user.id);
        if (ownerDuplicates.length > 0) {
          console.log(`[Duplicate Blocked] File '${originalFilename}' with hash ${hash.substring(0, 10)}... already exists for user ${req.user.name}`);
          duplicateWarnings.push({
            filename: originalFilename,
            message: `This is a duplicate file. Exact content already exists as '${ownerDuplicates[0].original_filename}'.`
          });
          // Clean up uploaded temp file and skip MinIO/DB operations
          safeUnlink(targetPath);
          continue;
        }

        // 3. MinIO Object Deduplication: Check if content hash exists globally for object reuse
        const globalExisting = await fileRepository.findAnyByHash(hash);
        let finalStoredFilename = storedFilename;
        let objectReused = false;

        if (globalExisting && globalExisting.stored_filename) {
          finalStoredFilename = globalExisting.stored_filename;
          objectReused = true;
          console.log(`[MinIO Deduplication] Reusing existing object key '${finalStoredFilename}' for file '${originalFilename}' (SHA256: ${hash.substring(0, 10)}...)`);
        } else {
          // Upload File to MinIO Object Storage
          console.log("===== SINGLE FILE UPLOAD =====");
          console.log("File:", originalFilename);
          console.log("Stored:", storedFilename);
          console.log("Uploading to MinIO Bucket...");

          try {
            await minioService.uploadFile(
              storedFilename,
              targetPath,
              {
                "Content-Type": file.mimetype || "application/octet-stream"
              }
            );
            console.log("Uploaded to MinIO Bucket successfully!");
          } catch (minioUploadErr) {
            console.warn("[MinIO Notice] Object upload warning, file retained on local storage:", minioUploadErr.message);
          }
        }

        // 4. Process File Versioning
        const { version, displayFilename } = await processFileVersion(req.user.id, originalFilename);

        // 5. Save metadata to repository
        const fileRecord = await fileRepository.createFile({
          id: uuidv4(),
          owner_id: req.user.id,
          original_filename: displayFilename,
          stored_filename: finalStoredFilename,
          path: targetPath,
          file_size: fileSize,
          file_hash: hash,
          version
        });

        // Safe unlink of local temp file if object was reused
        if (objectReused) {
          safeUnlink(targetPath);
        }

        // 6. Create Audit Log
        await auditRepository.log({
          user_id: req.user.id,
          user_name: req.user.name,
          action: AUDIT_ACTIONS.UPLOAD,
          filename: displayFilename,
          details: `Uploaded ${fileSize} bytes (v${version})${objectReused ? ' [Storage deduplicated]' : ''}`
        });

        uploadedResults.push(fileRecord);
      }

      if (uploadedResults.length === 0 && duplicateWarnings.length > 0) {
        return res.status(409).json({
          success: false,
          error: duplicateWarnings[0].message,
          duplicates: duplicateWarnings
        });
      }

      // Live update event broadcast
      if (req.io && uploadedResults.length > 0) {
        req.io.emit('file:uploaded', {
          count: uploadedResults.length,
          uploader: req.user.name
        });
      }

      return res.status(201).json({
        success: true,
        message: `${uploadedResults.length} file(s) uploaded successfully.${duplicateWarnings.length > 0 ? ` ${duplicateWarnings.length} duplicate file(s) skipped.` : ''}`,
        files: uploadedResults,
        duplicates: duplicateWarnings
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /download/:id (Supports HTTP Range Resumable Downloads & Personal Copy Creation)
  async downloadFile(req, res, next) {
    try {
      const fileId = req.params.id;
      const file = await fileRepository.findById(fileId);

      if (!file) {
        return res.status(404).json({ success: false, error: 'File not found.' });
      }

      const shareRepository = require('../repositories/share.repository');
      const isOwner = file.owner_id === req.user.id;
      const isAdmin = req.user.role === 'admin';
      let sharePermission = null;

      // Permissions check
      if (!isAdmin && !isOwner) {
        sharePermission = await shareRepository.getFileSharePermission(fileId, req.user.id);
        if (!sharePermission) {
          return res.status(403).json({ success: false, error: 'Access denied to this file.' });
        }
      }

      // 1. MinIO Object Key (stored_filename)
      const objectKey = file.stored_filename;

      if (!objectKey) {
        return res.status(404).json({ success: false, error: 'Invalid MinIO object key in file metadata record.' });
      }

      // 2. Stream object directly from MinIO S3 Object Storage bucket
      try {
        const minioStream = await minioService.getObjectStream(objectKey);

        await auditRepository.log({
          user_id: req.user.id,
          user_name: req.user.name,
          action: AUDIT_ACTIONS.DOWNLOAD,
          filename: file.original_filename,
          details: `Downloaded object '${objectKey}' from MinIO storage`
        });

        // 3. Set response headers
        if (file.file_size) {
          res.setHeader('Content-Length', file.file_size);
        }
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_filename)}"; filename*=${encodeURIComponent(file.original_filename)}`);

        // 4. Stream directly to response
        return minioStream.pipe(res);
      } catch (minioErr) {
        console.error(`[MinIO Download Error] Key '${objectKey}' failed:`, minioErr.message);
        return res.status(404).json({
          success: false,
          error: `Object '${file.original_filename}' is missing from MinIO object storage.`
        });
      }
    } catch (err) {
      next(err);
    }
  }

  // POST /download/batch (Download multiple files as ZIP archive)
  async downloadBatch(req, res, next) {
    try {
      const { fileIds } = req.body;
      if (!Array.isArray(fileIds) || fileIds.length === 0) {
        return res.status(400).json({ success: false, error: 'Provide an array of fileIds to download.' });
      }

      const zipFilename = `download_batch_${Date.now()}.zip`;
      const archive = archiver('zip', { zlib: { level: 9 } });

      res.attachment(zipFilename);
      archive.pipe(res);

      for (const id of fileIds) {
        const file = await fileRepository.findById(id);
        if (file) {
          const isOwner = file.owner_id === req.user.id;
          const isAdmin = req.user.role === 'admin';
          const shareRepository = require('../repositories/share.repository');
          const isShared = await shareRepository.getFileSharePermission(id, req.user.id);

          if (isOwner || isAdmin || isShared) {
            const filePath = verifyPathInStorage(file.path);
            if (fs.existsSync(filePath)) {
              archive.file(filePath, { name: file.original_filename });
            }
          }
        }
      }

      await auditRepository.log({
        user_id: req.user.id,
        user_name: req.user.name,
        action: AUDIT_ACTIONS.DOWNLOAD,
        filename: zipFilename,
        details: `Batch downloaded ${fileIds.length} files as zip archive`
      });

      await archive.finalize();
    } catch (err) {
      next(err);
    }
  }

  // PUT /rename/:id
  async renameFile(req, res, next) {
    try {
      const fileId = req.params.id;
      const { newName } = req.body;

      if (!newName || typeof newName !== 'string') {
        return res.status(400).json({ success: false, error: 'New file name is required.' });
      }

      const file = await fileRepository.findById(fileId);
      if (!file) {
        return res.status(404).json({ success: false, error: 'File not found.' });
      }

      const isOwner = file.owner_id === req.user.id;
      const isAdmin = req.user.role === 'admin';

      if (!isOwner && !isAdmin) {
        const shareRepository = require('../repositories/share.repository');
        const sharePermission = await shareRepository.getFileSharePermission(fileId, req.user.id);

        if (!sharePermission) {
          return res.status(403).json({ success: false, error: 'Access denied. You do not have permission to edit this file.' });
        }

        if (sharePermission !== 'editor') {
          return res.status(403).json({ success: false, error: 'Forbidden. Viewer permission does not allow editing shared files.' });
        }

        // GOOGLE DRIVE STYLE "MAKE A COPY":
        // When an Editor renames a shared file, create an independent personal working copy for req.user.id in "My Files"
        function sanitizeFilename(filename) {
          return filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        }

        function verifyPathInStorage(filePath) {
          const resolvedPath = path.resolve(filePath);
          const resolvedStorageDir = path.resolve(STORAGE_DIR);
          if (!resolvedPath.startsWith(resolvedStorageDir)) {
            throw new Error('Directory traversal attempt blocked.');
          }
          return resolvedPath;
        }

        function safeUnlink(filePath, retries = 3, delayMs = 300) {
          if (!filePath || !fs.existsSync(filePath)) return;
          try {
            fs.unlinkSync(filePath);
          } catch (err) {
            if ((err.code === 'EBUSY' || err.code === 'EPERM') && retries > 0) {
              setTimeout(() => safeUnlink(filePath, retries - 1, delayMs), delayMs);
            } else {
              console.warn(`[Cleanup Notice] Deferred unlink for '${path.basename(filePath)}': ${err.message}`);
            }
          }
        }
        const cleanNewName = sanitizeFilename(newName);
        const sourcePath = verifyPathInStorage(file.path);
        const ext = path.extname(file.original_filename);
        const newStoredFilename = `${uuidv4()}${ext}`;
        const newPath = path.join(STORAGE_DIR, newStoredFilename);

        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, newPath);
        }

        const { version } = await processFileVersion(req.user.id, cleanNewName);
        const stat = fs.existsSync(sourcePath) ? fs.statSync(sourcePath) : { size: file.file_size };

        const newPersonalFile = await fileRepository.createFile({
          id: uuidv4(),
          owner_id: req.user.id,
          original_filename: cleanNewName,
          stored_filename: newStoredFilename,
          path: newPath,
          file_size: stat.size,
          file_hash: file.file_hash,
          version
        });

        await auditRepository.log({
          user_id: req.user.id,
          user_name: req.user.name,
          action: AUDIT_ACTIONS.RENAME,
          filename: cleanNewName,
          details: `Created personal editable copy '${cleanNewName}' from shared file '${file.original_filename}'. Original owner's file remains unchanged.`
        });

        if (req.io) {
          req.io.emit('file:uploaded', { uploader: req.user.name });
        }

        return res.status(200).json({
          success: true,
          message: `This action created your own editable copy '${cleanNewName}' in My Files. The original owner's file remains unchanged.`,
          file: newPersonalFile,
          isPersonalCopyCreated: true
        });
      }

      // File Lock check
      if (file.is_locked && file.locked_by !== req.user.id) {
        return res.status(423).json({
          success: false,
          error: 'This file is currently locked by another user.'
        });
      }

      const cleanNewName = sanitizeFilename(newName);
      const updated = await fileRepository.updateName(fileId, cleanNewName);

      await auditRepository.log({
        user_id: req.user.id,
        user_name: req.user.name,
        action: AUDIT_ACTIONS.RENAME,
        filename: cleanNewName,
        details: `Renamed from '${file.original_filename}' to '${cleanNewName}'`
      });

      if (req.io) {
        req.io.emit('file:renamed', { id: fileId, newName: cleanNewName });
      }

      return res.status(200).json({
        success: true,
        message: 'File renamed successfully.',
        file: updated
      });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /delete/:id
  async deleteFile(req, res, next) {
    try {
      const fileId = req.params.id;
      const file = await fileRepository.findById(fileId);

      if (!file) {
        return res.status(404).json({ success: false, error: 'File not found.' });
      }

      if (req.user.role !== 'admin' && file.owner_id !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Forbidden. Only the file owner or Admin can delete original shared files.' });
      }

      // Check file lock
      if (file.is_locked && file.locked_by !== req.user.id) {
        return res.status(423).json({
          success: false,
          error: 'This file is currently locked by another user.'
        });
      }

      // Delete object from MinIO Storage & local fallback
      try {
        await minioService.removeObject(file.stored_filename);
        const filePath = verifyPathInStorage(file.path);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (e) {
        console.warn(`[Delete Warning] Could not remove object or physical file: ${e.message}`);
      }

      // Delete database record
      await fileRepository.deleteById(fileId);

      await auditRepository.log({
        user_id: req.user.id,
        user_name: req.user.name,
        action: AUDIT_ACTIONS.DELETE,
        filename: file.original_filename,
        details: `Deleted file (ID: ${fileId})`
      });

      if (req.io) {
        req.io.emit('file:deleted', { id: fileId, filename: file.original_filename });
      }

      return res.status(200).json({
        success: true,
        message: 'File deleted successfully.'
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /search
  async searchFiles(req, res, next) {
    try {
      const { q, ext, owner_name, start_date, end_date } = req.query;

      const results = await fileRepository.searchFiles(
        {
          query: q,
          extension: ext,
          owner_name,
          start_date,
          end_date
        },
        req.user
      );

      await auditRepository.log({
        user_id: req.user.id,
        user_name: req.user.name,
        action: AUDIT_ACTIONS.SEARCH,
        details: `Searched files with query: "${q || 'all'}"`
      });

      return res.status(200).json({
        success: true,
        count: results.length,
        files: results
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /files/:id/lock
  async lockFile(req, res, next) {
    try {
      const fileId = req.params.id;
      const lockedFile = await lockService.lockFile(fileId, req.user.id);

      await auditRepository.log({
        user_id: req.user.id,
        user_name: req.user.name,
        action: AUDIT_ACTIONS.LOCK,
        filename: lockedFile.original_filename,
        details: 'Acquired file lock'
      });

      if (req.io) {
        req.io.emit('file:locked', { id: fileId, locked: true, lockedBy: req.user.name });
      }

      return res.status(200).json({
        success: true,
        message: 'File locked successfully.',
        file: lockedFile
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  // POST /files/:id/unlock
  async unlockFile(req, res, next) {
    try {
      const fileId = req.params.id;
      const isAdmin = req.user.role === 'admin';
      const unlockedFile = await lockService.unlockFile(fileId, req.user.id, isAdmin);

      await auditRepository.log({
        user_id: req.user.id,
        user_name: req.user.name,
        action: AUDIT_ACTIONS.UNLOCK,
        filename: unlockedFile.original_filename,
        details: 'Released file lock'
      });

      if (req.io) {
        req.io.emit('file:locked', { id: fileId, locked: false, lockedBy: null });
      }

      return res.status(200).json({
        success: true,
        message: 'File unlocked successfully.',
        file: unlockedFile
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }
}

module.exports = new FileController();
