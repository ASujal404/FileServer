const auditRepository = require('../repositories/audit.repository');

class AuditController {
  async getLogs(req, res, next) {
    try {
      const { action, limit } = req.query;
      const user = req.user;

      const filter = {
        action,
        limit: limit ? parseInt(limit, 10) : 100
      };

      if (user.role !== 'admin') {
        filter.user_id = user.id;
      }

      const logs = await auditRepository.getLogs(filter);

      return res.status(200).json({
        success: true,
        count: logs.length,
        logs
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuditController();
