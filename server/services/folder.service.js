const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');
const folderRepository = require('../repositories/folder.repository');
const fileRepository = require('../repositories/file.repository');
const auditRepository = require('../repositories/audit.repository');
const minioService = require('./minio.service');
const { calculateFileHash } = require('./hash.service');
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

class FolderService {
  async uploadFolder({ user, files, relativePaths = [] }) {
    if (!files || files.length === 0) {
      throw new Error('No files provided in folder upload.');
    }

    const createdFoldersMap = new Map(); // relative_path -> folder record
    const uploadedFiles = [];
    const duplicateWarnings = [];

    // 1. Determine root folder name from relativePaths or first file path
    const samplePath = relativePaths[0] || files[0].originalname;
    const pathParts = samplePath.replace(/\\/g, '/').split('/').filter(Boolean);
    const rawRootFolderName = pathParts[0] || 'NewFolder';

    // 2. Folder Versioning: Check if root folder name exists for owner
    const maxVersion = await folderRepository.findHighestVersion(user.id, rawRootFolderName);
    let version = 1;
    let actualRootFolderName = rawRootFolderName;

    if (maxVersion > 0) {
      version = maxVersion + 1;
      actualRootFolderName = `${rawRootFolderName}_v${version}`;
    }

    // 3. Process each uploaded file and its directory tree
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let relPath = (relativePaths[i] || file.originalname).replace(/\\/g, '/');
      
      // If versioned root, replace root folder name in relative path
      const parts = relPath.split('/').filter(Boolean);
      if (parts[0] === rawRootFolderName) {
        parts[0] = actualRootFolderName;
      }
      relPath = parts.join('/');

      const originalFilename = parts[parts.length - 1];
      const folderSubPath = parts.slice(0, parts.length - 1).join('/');

      // Build intermediate directory records
      let currentAccPath = '';
      let parentPath = 'ROOT';
      let parentFolderId = null;

      for (let depth = 0; depth < parts.length - 1; depth++) {
        const seg = parts[depth];
        currentAccPath = currentAccPath ? `${currentAccPath}/${seg}` : seg;

        if (!createdFoldersMap.has(currentAccPath)) {
          let existing = await folderRepository.findByRelativePath(user.id, currentAccPath);
          if (!existing) {
            existing = await folderRepository.createFolder({
              id: uuidv4(),
              owner_id: user.id,
              name: seg,
              relative_path: currentAccPath,
              parent_folder: parentPath,
              depth,
              version: depth === 0 ? version : 1
            });
          }
          createdFoldersMap.set(currentAccPath, existing);
        }
        parentFolderId = createdFoldersMap.get(currentAccPath).id;
        parentPath = currentAccPath;
      }

      // Store physical file
      const storedFilename = file.filename;
      const targetPath = verifyPathInStorage(file.path);
      const fileSize = file.size;

      console.log("===== FILE START =====");
      console.log("File:", file.originalname);
      console.log("Stored:", storedFilename);
      console.log("Temp Path:", targetPath);

      // Calculate SHA-256 hash
      const hash = await calculateFileHash(targetPath);

      // Detect duplicates for owner
      const ownerDuplicates = await fileRepository.findByHash(hash, user.id);
      if (ownerDuplicates.length > 0) {
        console.log(`[Folder Upload] Blocked duplicate file '${originalFilename}' for user ${user.name}`);
        duplicateWarnings.push({
          filename: relPath,
          message: `This is a duplicate file. Exact content already exists as '${ownerDuplicates[0].original_filename}'.`
        });
        safeUnlink(targetPath);
        continue;
      }

      // Check global hash for MinIO object deduplication
      const globalExisting = await fileRepository.findAnyByHash(hash);
      let finalStoredFilename = storedFilename;
      let objectReused = false;

      if (globalExisting && globalExisting.stored_filename) {
        finalStoredFilename = globalExisting.stored_filename;
        objectReused = true;
        console.log(`[Folder Upload MinIO Deduplication] Reusing existing object key '${finalStoredFilename}' for file '${originalFilename}'`);
      } else {
        console.log("Calling MinIO Upload...");
        try {
          await minioService.uploadFile(
            storedFilename,
            targetPath,
            {
              "Content-Type": file.mimetype || "application/octet-stream"
            }
          );
          console.log("MinIO Upload Completed");
        } catch (minioErr) {
          console.warn("[MinIO Notice] Folder file upload warning:", minioErr.message);
        }
      }

      // Delete local temp file
      safeUnlink(targetPath);

      console.log("Creating Database Record...");

      // Save metadata record into database
      const fileRecord = await fileRepository.createFile({
        id: uuidv4(),
        owner_id: user.id,
        folder_id: parentFolderId,
        original_filename: originalFilename,
        stored_filename: finalStoredFilename,
        path: targetPath,
        relative_path: relPath,
        parent_folder: parentPath,
        depth: parts.length - 1,
        file_size: fileSize,
        file_hash: hash,
        version: 1
      });

      console.log("Database Record Created");
      console.log("===== FILE END =====");

      uploadedFiles.push(fileRecord);
    }

    // Log folder upload
    await auditRepository.log({
      user_id: user.id,
      user_name: user.name,
      action: AUDIT_ACTIONS.UPLOAD,
      filename: actualRootFolderName,
      details: `Uploaded folder '${actualRootFolderName}' containing ${uploadedFiles.length} files (v${version})`
    });

    return {
      rootFolderName: actualRootFolderName,
      fileCount: uploadedFiles.length,
      version,
      files: uploadedFiles,
      duplicates: duplicateWarnings
    };
  }

  async getFolderPreview(folderId, user) {
    const folder = await folderRepository.findById(folderId);
    if (!folder) throw new Error('Folder not found.');

    if (user.role !== 'admin' && folder.owner_id !== user.id) {
      // Check shared permission
      const sharedList = JSON.parse(folder.shared_with || '[]');
      if (!sharedList.includes(user.id)) {
        throw new Error('Access denied to this folder.');
      }
    }

    const childFiles = await fileRepository.findByRelativePathPrefix(folder.owner_id, folder.relative_path);
    const allUserFolders = await folderRepository.findByOwner(folder.owner_id);
    const childFolders = allUserFolders.filter(f => f.relative_path.startsWith(`${folder.relative_path}/`));

    const totalSize = childFiles.reduce((acc, f) => acc + parseInt(f.file_size, 10), 0);
    const maxDepth = Math.max(folder.depth, ...childFolders.map(f => f.depth), ...childFiles.map(f => f.depth));

    return {
      folder,
      totalSize,
      fileCount: childFiles.length,
      subfolderCount: childFolders.length,
      maxDepth,
      files: childFiles,
      subfolders: childFolders
    };
  }

  async streamFolderZip(folderId, user, res) {
    const folder = await folderRepository.findById(folderId);
    if (!folder) throw new Error('Folder not found.');

    if (user.role !== 'admin' && folder.owner_id !== user.id) {
      const sharedList = JSON.parse(folder.shared_with || '[]');
      if (!sharedList.includes(user.id)) throw new Error('Access denied.');
    }

    const childFiles = await fileRepository.findByRelativePathPrefix(folder.owner_id, folder.relative_path);

    const zipFilename = `${folder.name}_${Date.now()}.zip`;
    const archive = archiver('zip', { zlib: { level: 9 } });

    res.attachment(zipFilename);
    archive.pipe(res);

    for (const f of childFiles) {
      try {
        const minioStream = await minioService.getObjectStream(f.stored_filename);
        archive.append(minioStream, { name: f.relative_path || f.original_filename });
      } catch (mErr) {
        const filePath = verifyPathInStorage(f.path);
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: f.relative_path || f.original_filename });
        }
      }
    }

    await auditRepository.log({
      user_id: user.id,
      user_name: user.name,
      action: AUDIT_ACTIONS.DOWNLOAD,
      filename: folder.name,
      details: `Downloaded folder '${folder.name}' as ZIP archive (${childFiles.length} files)`
    });

    await archive.finalize();
  }

  async renameFolder(folderId, newName, user) {
    const folder = await folderRepository.findById(folderId);
    if (!folder) throw new Error('Folder not found.');

    const isOwner = folder.owner_id === user.id;
    const isAdmin = user.role === 'admin';

    if (!isOwner && !isAdmin) {
      const shareRepository = require('../repositories/share.repository');
      const sharePermission = await shareRepository.getFolderSharePermission(folderId, user.id);

      if (!sharePermission) {
        throw new Error('Access denied.');
      }

      if (sharePermission !== 'editor') {
        throw new Error('Forbidden. Viewer permission does not allow renaming folders.');
      }
    }

    if (folder.is_locked && folder.locked_by !== user.id) {
      throw new Error('This folder is currently locked by another user.');
    }

    const cleanNewName = sanitizeFilename(newName);
    const oldRelPath = folder.relative_path;
    const parts = oldRelPath.split('/');
    parts[parts.length - 1] = cleanNewName;
    const newRelPath = parts.join('/');

    const updatedFolder = await folderRepository.updateNameAndPaths(folderId, cleanNewName, oldRelPath, newRelPath);

    await auditRepository.log({
      user_id: user.id,
      user_name: user.name,
      action: AUDIT_ACTIONS.RENAME,
      filename: cleanNewName,
      details: `Renamed folder '${folder.name}' to '${cleanNewName}'`
    });

    return updatedFolder;
  }

  async deleteFolder(folderId, user) {
    const folder = await folderRepository.findById(folderId);
    if (!folder) throw new Error('Folder not found.');

    const isOwner = folder.owner_id === user.id;
    const isAdmin = user.role === 'admin';

    if (!isAdmin && !isOwner) {
      throw new Error('Forbidden. Only the folder owner or Admin can delete original shared folders.');
    }

    if (folder.is_locked && folder.locked_by !== user.id) {
      throw new Error('This folder is currently locked by another user.');
    }

    // Find all files under this folder tree to clean up disk / MinIO
    const childFiles = await fileRepository.findByRelativePathPrefix(folder.owner_id, folder.relative_path);
    for (const f of childFiles) {
      try {
        await minioService.removeObject(f.stored_filename);
        const filePath = verifyPathInStorage(f.path);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (e) {
        // ignore individual unlink error
      }
    }

    // Cascade delete in repository
    await folderRepository.deleteChildFoldersAndFiles(folder.owner_id, folder.relative_path);

    await auditRepository.log({
      user_id: user.id,
      user_name: user.name,
      action: AUDIT_ACTIONS.DELETE,
      filename: folder.name,
      details: `Deleted folder '${folder.name}' and all recursive subdirectories/files`
    });

    return true;
  }
}

module.exports = new FolderService();
