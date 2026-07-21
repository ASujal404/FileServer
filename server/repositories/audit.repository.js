const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const fallbackDb = require('../database/fallbackDb');

class AuditRepository {
  async log({ user_id, user_name, action, filename = null, details = null }) {
    const id = uuidv4();
    const timestamp = new Date().toISOString();

    if (db.getIsConnected()) {
      const sql = `
        INSERT INTO audit_logs (id, user_id, user_name, action, filename, details, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `;
      const res = await db.query(sql, [id, user_id, user_name, action, filename, details, timestamp]);
      return res.rows[0];
    } else {
      const store = fallbackDb.getStore();
      const newLog = {
        id,
        user_id,
        user_name: user_name || 'System User',
        action,
        filename,
        details,
        timestamp
      };
      store.audit_logs.unshift(newLog);
      fallbackDb.saveStore();
      return newLog;
    }
  }

  async getLogs({ user_id, action, limit = 100 }) {
    if (db.getIsConnected()) {
      let sql = `SELECT * FROM audit_logs`;
      const conditions = [];
      const params = [];

      if (user_id) {
        params.push(user_id);
        conditions.push(`user_id = $${params.length}`);
      }

      if (action) {
        params.push(action);
        conditions.push(`action = $${params.length}`);
      }

      if (conditions.length > 0) {
        sql += ` WHERE ` + conditions.join(' AND ');
      }

      sql += ` ORDER BY timestamp DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const res = await db.query(sql, params);
      return res.rows;
    } else {
      let logs = fallbackDb.getStore().audit_logs;
      if (user_id) logs = logs.filter(l => l.user_id === user_id);
      if (action) logs = logs.filter(l => l.action === action);
      return logs.slice(0, limit);
    }
  }
}

module.exports = new AuditRepository();
