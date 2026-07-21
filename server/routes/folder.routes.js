const express = require('express');
const router = express.Router();
const folderController = require('../controllers/folder.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

router.use(authenticateToken);

router.get('/folders', folderController.getFolders);
router.post('/upload-folder', upload.array('files', 5000), folderController.uploadFolder);
router.post('/upload/folder', upload.array('files', 5000), folderController.uploadFolder);
router.post('/folders/upload', upload.array('files', 5000), folderController.uploadFolder);

router.get('/folders/preview/:id', folderController.previewFolder);
router.get('/download/folder/:id', folderController.downloadFolderZip);
router.put('/folders/rename/:id', folderController.renameFolder);
router.delete('/folders/delete/:id', folderController.deleteFolder);

router.post('/folders/:id/lock', folderController.lockFolder);
router.post('/folders/:id/unlock', folderController.unlockFolder);
router.post('/folders/:id/share', folderController.shareFolder);

module.exports = router;
