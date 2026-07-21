const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

router.get('/logs', authenticateToken, auditController.getLogs);

module.exports = router;
