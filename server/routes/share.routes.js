const express = require('express');
const router = express.Router();
const shareController = require('../controllers/share.controller');
const { authenticateToken, requireAdmin } = require('../middlewares/auth.middleware');

// All endpoints require authentication
router.use(authenticateToken);

// Destination User Endpoint (Accessible to all authenticated users)
router.get('/shared-with-me', shareController.getSharedWithMe);

// User Listing & Sharing Endpoints (Accessible to all authenticated users)
router.get('/users', shareController.getAllUsersForShare);
router.get('/users/search', shareController.searchUsers);

router.post('/share', shareController.share);
router.post('/share/folder', shareController.share);
router.post('/share/file', shareController.share);

router.get('/shared-users', shareController.getSharedUsers);
router.get('/share/users/:itemId', shareController.getSharedUsers);

router.delete('/share', shareController.revokeShare);
router.delete('/share/folder/:folderId/user/:targetUserId', shareController.revokeShare);
router.delete('/share/file/:fileId/user/:targetUserId', shareController.revokeShare);

module.exports = router;
