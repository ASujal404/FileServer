const path = require('path');
const fileRepository = require('../repositories/file.repository');

async function processFileVersion(owner_id, originalFilename) {
  const currentMax = await fileRepository.findHighestVersion(owner_id, originalFilename);
  
  if (currentMax === 0) {
    return {
      version: 1,
      displayFilename: originalFilename
    };
  }

  const newVersion = currentMax + 1;
  const ext = path.extname(originalFilename);
  const baseName = path.basename(originalFilename, ext);
  
  // Format: resume_v2.pdf
  const displayFilename = `${baseName}_v${newVersion}${ext}`;

  return {
    version: newVersion,
    displayFilename
  };
}

module.exports = { processFileVersion };
