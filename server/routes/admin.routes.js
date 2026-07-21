const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticateToken, requireAdmin } = require('../middlewares/auth.middleware');

router.use(authenticateToken, requireAdmin);

router.get('/users', adminController.getUsers);
router.put('/users/:id/status', adminController.disableUser);
router.delete('/users/:id', adminController.deleteUser);
router.get('/metrics', adminController.getDashboardMetrics);

module.exports = router;
