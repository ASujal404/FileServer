const fileRepository = require('../repositories/file.repository');

class LockService {
  async lockFile(fileId, userId) {
    const file = await fileRepository.findById(fileId);
    if (!file) throw new Error('File not found.');

    if (file.is_locked && file.locked_by !== userId) {
      throw new Error('This file is currently locked by another user.');
    }

    const updated = await fileRepository.setLock(fileId, true, userId);
    return updated;
  }

  async unlockFile(fileId, userId, isAdmin = false) {
    const file = await fileRepository.findById(fileId);
    if (!file) throw new Error('File not found.');

    if (file.is_locked && file.locked_by !== userId && !isAdmin) {
      throw new Error('You cannot unlock a file locked by another user.');
    }

    const updated = await fileRepository.setLock(fileId, false, null);
    return updated;
  }
}

module.exports = new LockService();
