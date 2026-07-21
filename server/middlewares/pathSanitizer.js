const path = require('path');
const { STORAGE_DIR } = require('../config/constants');

/**
 * Sanitizes filename and verifies target path remains inside STORAGE_DIR
 */
function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    throw new Error('Invalid filename provided.');
  }

  // Remove path traversal sequences and leading slashes
  const safeName = path.basename(filename.replace(/\\/g, '/'));
  
  if (safeName === '.' || safeName === '..' || !safeName) {
    throw new Error('Invalid file path structure.');
  }

  return safeName;
}

function verifyPathInStorage(targetPath) {
  const resolvedPath = path.resolve(targetPath);
  const resolvedStorage = path.resolve(STORAGE_DIR);

  if (!resolvedPath.startsWith(resolvedStorage)) {
    throw new Error('Path traversal attempt blocked: path is outside allowed storage directory.');
  }

  return resolvedPath;
}

module.exports = {
  sanitizeFilename,
  verifyPathInStorage
};
