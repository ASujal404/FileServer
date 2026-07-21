const express = require('express');
const router = express.Router();
const fileController = require('../controllers/file.controller');
const folderController = require('../controllers/folder.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');
const { checkFileLock } = require('../middlewares/lock.middleware');

router.use(authenticateToken);

router.get('/files', fileController.getFiles);
router.post('/upload', upload.array('files', 5000), fileController.uploadFiles);
router.post('/upload-folder', upload.array('files', 5000), folderController.uploadFolder);
router.post('/upload/folder', upload.array('files', 5000), folderController.uploadFolder);

router.get('/download/:id', fileController.downloadFile);
router.post('/download/batch', fileController.downloadBatch);
router.put('/rename/:id', checkFileLock, fileController.renameFile);
router.delete('/delete/:id', checkFileLock, fileController.deleteFile);
router.get('/search', fileController.searchFiles);

router.post('/files/:id/lock', fileController.lockFile);
router.post('/files/:id/unlock', fileController.unlockFile);

module.exports = router;
