const fileRepository = require('../repositories/file.repository');

async function checkFileLock(req, res, next) {
  try {
    const fileId = req.params.id || req.body.fileId;
    if (!fileId) return next();

    const file = await fileRepository.findById(fileId);
    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found.' });
    }

    if (file.is_locked && file.locked_by !== req.user.id) {
      return res.status(423).json({
        success: false,
        error: 'This file is currently locked by another user.',
        locked: true,
        lockedBy: file.owner_name || 'Another User'
      });
    }

    req.fileRecord = file;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { checkFileLock };
