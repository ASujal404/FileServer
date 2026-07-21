const express = require('express');
const router = express.Router();
const qrController = require('../controllers/qr.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { verifyQrSession } = require('../middlewares/verifyQrSession');

// Desktop QR Controls (Requires Desktop Authorization Bearer JWT)
router.post('/qr/generate', authenticateToken, (req, res, next) => qrController.generateSession(req, res, next));
router.post('/qr/revoke', authenticateToken, (req, res, next) => qrController.revokeSession(req, res, next));

// Mobile QR Session Routes (Uses verifyQrSession middleware exclusively - NOT authenticateToken)
router.get('/mobile/session/:token', verifyQrSession, (req, res, next) => qrController.openSession(req, res, next));
router.get('/mobile/session/:token/data', verifyQrSession, (req, res, next) => qrController.getMobileSessionData(req, res, next));
router.get('/mobile/session/:token/download/:fileId', verifyQrSession, (req, res, next) => qrController.downloadMobileFile(req, res, next));
router.get('/qr/session/:token', verifyQrSession, (req, res, next) => qrController.getMobileSessionData(req, res, next));

module.exports = router;
