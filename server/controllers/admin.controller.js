const userRepository = require('../repositories/user.repository');
const fileRepository = require('../repositories/file.repository');
const auditRepository = require('../repositories/audit.repository');

class AdminController {
  async getUsers(req, res, next) {
    try {
      const users = await userRepository.getAllUsers();
      return res.status(200).json({
        success: true,
        count: users.length,
        users
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteUser(req, res, next) {
    try {
      const userId = req.params.id;
      if (userId === req.user.id) {
        return res.status(400).json({ success: false, error: 'You cannot delete your own admin account.' });
      }

      const qrRepository = require('../repositories/qr.repository');
      await qrRepository.revokeUserSessions(userId);

      if (req.io) {
        req.io.emit('qr:revoked', { userId, reason: 'User account deleted by admin' });
      }

      const deleted = await userRepository.deleteUser(userId);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'User not found.' });
      }

      await auditRepository.log({
        user_id: req.user.id,
        user_name: req.user.name,
        action: 'DELETE_USER',
        details: `Deleted user ID: ${userId} and revoked all associated QR sessions`
      });

      return res.status(200).json({
        success: true,
        message: 'User deleted successfully.'
      });
    } catch (err) {
      next(err);
    }
  }

  async disableUser(req, res, next) {
    try {
      const userId = req.params.id;
      const { isDisabled } = req.body;

      if (userId === req.user.id) {
        return res.status(400).json({ success: false, error: 'You cannot disable your own admin account.' });
      }

      const qrRepository = require('../repositories/qr.repository');
      await qrRepository.revokeUserSessions(userId);

      if (req.io) {
        req.io.emit('qr:revoked', { userId, reason: 'User account status updated by admin' });
      }

      const updatedUser = await userRepository.setUserDisabledStatus(userId, isDisabled !== false);
      if (!updatedUser) {
        return res.status(404).json({ success: false, error: 'User not found.' });
      }

      await auditRepository.log({
        user_id: req.user.id,
        user_name: req.user.name,
        action: 'DISABLE_USER',
        details: `Updated disable status for user ID: ${userId} to ${isDisabled !== false} and revoked all associated QR sessions`
      });

      return res.status(200).json({
        success: true,
        message: `User ${isDisabled !== false ? 'disabled' : 'enabled'} successfully. All active QR sessions revoked.`,
        user: updatedUser
      });
    } catch (err) {
      next(err);
    }
  }

  async getDashboardMetrics(req, res, next) {
    try {
      const userCount = await userRepository.countUsers();
      const fileCount = await fileRepository.countFiles();
      const storageUsed = await fileRepository.getTotalStorageUsed();
      const allFiles = await fileRepository.findAll();
      const recentLogs = await auditRepository.getLogs({ limit: 10 });

      return res.status(200).json({
        success: true,
        metrics: {
          totalUsers: userCount,
          totalFiles: fileCount,
          storageUsedBytes: storageUsed,
          recentUploads: allFiles.slice(0, 5),
          latestActivities: recentLogs
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminController();
