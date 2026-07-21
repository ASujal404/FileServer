const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { STORAGE_DIR, MAX_FILE_SIZE, ALLOWED_EXTENSIONS } = require('../config/constants');
const { v4: uuidv4 } = require('uuid');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, STORAGE_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv4();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (ALLOWED_EXTENSIONS.includes(ext) || ALLOWED_EXTENSIONS.length === 0) {
    cb(null, true);
  } else {
    cb(new Error(`File type '${ext}' is not allowed. Supported types: ${ALLOWED_EXTENSIONS.join(', ')}`), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5000,
    fieldSize: 50 * 1024 * 1024
  },
  fileFilter
});

module.exports = upload;
