const folderRepository = require('../repositories/folder.repository');
const folderService = require('../services/folder.service');
const auditRepository = require('../repositories/audit.repository');

class FolderController {
  // POST /upload-folder
  async uploadFolder(req, res, next) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, error: 'No files uploaded in folder payload.' });
      }

      // Read relativePaths array sent in form data (e.g., req.body.relativePaths)
      let relativePaths = req.body.relativePaths;
      if (typeof relativePaths === 'string') {
        try {
          relativePaths = JSON.parse(relativePaths);
        } catch {
          relativePaths = [relativePaths];
        }
      }

      if (!Array.isArray(relativePaths)) {
        relativePaths = req.files.map(f => f.originalname);
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
    } catch (err) {
      next(err);
    }
  }

  // GET /folders
  async getFolders(req, res, next) {
    try {
      const user = req.user;
      let folders;
      if (user.role === 'admin') {
        folders = await folderRepository.findAll();
      } else {
        folders = await folderRepository.findByOwner(user.id);
      }

      return res.status(200).json({
        success: true,
        count: folders.length,
        folders
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /folders/preview/:id
  async previewFolder(req, res, next) {
    try {
      const folderId = req.params.id;
      const info = await folderService.getFolderPreview(folderId, req.user);
      return res.status(200).json({
        success: true,
        info
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /download/folder/:id (ZIP Download & Compression)
  async downloadFolderZip(req, res, next) {
    try {
      const folderId = req.params.id;
      await folderService.streamFolderZip(folderId, req.user, res);
    } catch (err) {
      next(err);
    }
  }

  // PUT /folders/rename/:id
  async renameFolder(req, res, next) {
    try {
      const folderId = req.params.id;
      const { newName } = req.body;

      if (!newName) {
        return res.status(400).json({ success: false, error: 'New folder name is required.' });
      }

      const updated = await folderService.renameFolder(folderId, newName, req.user);

      if (req.io) {
        req.io.emit('folder:renamed', { id: folderId, newName });
      }

      return res.status(200).json({
        success: true,
        message: 'Folder renamed successfully.',
        folder: updated
      });
    } catch (err) {
      if (err.message.includes('locked')) {
        return res.status(423).json({ success: false, error: err.message });
      }
      next(err);
    }
  }

  // DELETE /folders/delete/:id
  async deleteFolder(req, res, next) {
    try {
      const folderId = req.params.id;
      await folderService.deleteFolder(folderId, req.user);

      if (req.io) {
        req.io.emit('folder:deleted', { id: folderId });
      }

      return res.status(200).json({
        success: true,
        message: 'Folder deleted successfully.'
      });
    } catch (err) {
      if (err.message.includes('locked')) {
        return res.status(423).json({ success: false, error: err.message });
      }
      next(err);
    }
  }

  // POST /folders/:id/lock
  async lockFolder(req, res, next) {
    try {
      const folderId = req.params.id;
      const folder = await folderRepository.findById(folderId);
      if (!folder) return res.status(404).json({ success: false, error: 'Folder not found.' });

      if (folder.is_locked && folder.locked_by !== req.user.id) {
        return res.status(423).json({ success: false, error: 'This folder is currently locked by another user.' });
      }

      const updated = await folderRepository.setLock(folderId, true, req.user.id);

      await auditRepository.log({
        user_id: req.user.id,
        user_name: req.user.name,
        action: 'LOCK_FOLDER',
        filename: folder.name,
        details: 'Acquired folder lock'
      });

      if (req.io) {
        req.io.emit('folder:locked', { id: folderId, locked: true });
      }

      return res.status(200).json({ success: true, folder: updated });
    } catch (err) {
      next(err);
    }
  }

  // POST /folders/:id/unlock
  async unlockFolder(req, res, next) {
    try {
      const folderId = req.params.id;
      const folder = await folderRepository.findById(folderId);
      if (!folder) return res.status(404).json({ success: false, error: 'Folder not found.' });

      if (folder.is_locked && folder.locked_by !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'You cannot unlock a folder locked by another user.' });
      }

      const updated = await folderRepository.setLock(folderId, false, null);

      await auditRepository.log({
        user_id: req.user.id,
        user_name: req.user.name,
        action: 'UNLOCK_FOLDER',
        filename: folder.name,
        details: 'Released folder lock'
      });

      if (req.io) {
        req.io.emit('folder:locked', { id: folderId, locked: false });
      }

      return res.status(200).json({ success: true, folder: updated });
    } catch (err) {
      next(err);
    }
  }

  // POST /folders/:id/share
  async shareFolder(req, res, next) {
    try {
      const folderId = req.params.id;
      const { userIds } = req.body;

      if (!Array.isArray(userIds)) {
        return res.status(400).json({ success: false, error: 'Provide an array of user IDs to share with.' });
      }

      const updated = await folderRepository.updateSharing(folderId, userIds);

      await auditRepository.log({
        user_id: req.user.id,
        user_name: req.user.name,
        action: 'SHARE_FOLDER',
        filename: updated.name,
        details: `Shared folder with ${userIds.length} user(s)`
      });

      return res.status(200).json({
        success: true,
        message: 'Folder sharing permissions updated successfully.',
        folder: updated
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new FolderController();
