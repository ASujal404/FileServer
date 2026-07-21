const shareService = require('../services/share.service');
const userRepository = require('../repositories/user.repository');

class ShareController {
  // GET /users
  async getAllUsersForShare(req, res, next) {
    try {
      const users = await userRepository.getUsersExcept(req.user.id);
      return res.status(200).json({
        success: true,
        count: users.length,
        users
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /users/search?q=
  async searchUsers(req, res, next) {
    try {
      const { q } = req.query;
      const users = await userRepository.searchUsers(q, req.user.id);
      return res.status(200).json({
        success: true,
        count: users.length,
        users
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /share & POST /share/folder & POST /share/file
  async share(req, res, next) {
    try {
      const { itemId, folderId, fileId, isFolder, targetUserIds, permission } = req.body;
      const targetIds = Array.isArray(targetUserIds) ? targetUserIds : [];

      if (targetIds.length === 0) {
        return res.status(400).json({ success: false, error: 'Provide an array of targetUserIds to share with.' });
      }

      const targetItemId = itemId || folderId || fileId;
      const isFolderType = isFolder === true || Boolean(folderId);

      if (!targetItemId) {
        return res.status(400).json({ success: false, error: 'Provide itemId or folderId or fileId.' });
      }

      let result;
      if (isFolderType) {
        result = await shareService.shareFolder({
          folderId: targetItemId,
          ownerUser: req.user,
          targetUserIds: targetIds,
          permission: permission || 'viewer'
        });
      } else {
        result = await shareService.shareFile({
          fileId: targetItemId,
          ownerUser: req.user,
          targetUserIds: targetIds,
          permission: permission || 'viewer'
        });
      }

      if (req.io) {
        req.io.emit('share:updated', { itemId: targetItemId, sharedWith: result.sharedWith });
      }

      return res.status(200).json({
        success: true,
        message: `Shared successfully with ${result.sharedWith.length} user(s).`,
        ...result
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /shared-users & GET /share/users/:itemId
  async getSharedUsers(req, res, next) {
    try {
      const itemId = req.params.itemId || req.query.itemId || req.query.folderId || req.query.fileId;
      const isFolder = req.query.isFolder === 'true' || Boolean(req.query.folderId);

      if (!itemId) {
        return res.status(400).json({ success: false, error: 'itemId is required.' });
      }

      const users = await shareService.getSharedUsers(itemId, isFolder);
      return res.status(200).json({
        success: true,
        count: users.length,
        users
      });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /share & DELETE /share/folder/:folderId/user/:targetUserId
  async revokeShare(req, res, next) {
    try {
      const itemId = req.params.folderId || req.params.fileId || req.query.itemId || req.body.itemId || req.query.folderId || req.body.folderId || req.query.fileId || req.body.fileId;
      const targetUserId = req.params.targetUserId || req.query.targetUserId || req.body.targetUserId;
      const isFolder = req.params.folderId ? true : req.params.fileId ? false : (req.query.isFolder === 'true' || req.body.isFolder === true || Boolean(req.query.folderId || req.body.folderId));

      if (!itemId || !targetUserId) {
        return res.status(400).json({ success: false, error: 'itemId and targetUserId are required.' });
      }

      if (isFolder) {
        await shareService.revokeFolderShare(itemId, req.user, targetUserId);
      } else {
        await shareService.revokeFileShare(itemId, req.user, targetUserId);
      }

      if (req.io) {
        req.io.emit('share:updated', { itemId, revokedUser: targetUserId });
      }

      return res.status(200).json({
        success: true,
        message: 'Share access revoked successfully.'
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /shared-with-me
  async getSharedWithMe(req, res, next) {
    try {
      const items = await shareService.getSharedWithMe(req.user.id);
      return res.status(200).json({
        success: true,
        ...items
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ShareController();
