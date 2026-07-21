const express = require('express');
const router = express.Router();
const storageController = require('../controllers/storage.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

router.get('/storage', authenticateToken, storageController.getStorageInfo);

module.exports = router;
