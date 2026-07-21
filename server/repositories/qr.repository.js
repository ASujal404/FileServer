const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const fallbackDb = require('../database/fallbackDb');

class QrRepository {
  async createSession({ id, user_id, session_token, expires_at }) {
    const sessionId = id || uuidv4();
    const createdAt = new Date();
    const expiresAtDate = new Date(expires_at);

    if (db.getIsConnected()) {
      const sql = `
        INSERT INTO qr_sessions (id, user_id, session_token, created_at, expires_at, is_revoked)
        VALUES ($1, $2, $3, $4, $5, FALSE)
        RETURNING *
      `;
      const res = await db.query(sql, [sessionId, user_id, session_token, createdAt, expiresAtDate]);
      return res.rows[0];
    } else {
      const record = {
        id: sessionId,
        user_id,
        session_token,
        created_at: createdAt.toISOString(),
        expires_at: expiresAtDate.toISOString(),
        is_revoked: false,
        last_accessed: null
      };
      fallbackDb.getStore().qr_sessions.push(record);
      fallbackDb.saveStore();
      return record;
    }
  }

  async findValidSession(token) {
    const now = new Date();
    if (db.getIsConnected()) {
      const sql = `
        SELECT * FROM qr_sessions
        WHERE session_token = $1
          AND is_revoked = FALSE
          AND expires_at > $2
        LIMIT 1
      `;
      const res = await db.query(sql, [token, now]);
      return res.rows[0] || null;
    } else {
      const store = fallbackDb.getStore();
      return store.qr_sessions.find(
        s => s.session_token === token && !s.is_revoked && new Date(s.expires_at) > now
      ) || null;
    }
  }

  async findActiveSessionByUser(userId) {
    const now = new Date();
    if (db.getIsConnected()) {
      const sql = `
        SELECT * FROM qr_sessions
        WHERE user_id = $1
          AND is_revoked = FALSE
          AND expires_at > $2
        ORDER BY created_at DESC
        LIMIT 1
      `;
      const res = await db.query(sql, [userId, now]);
      return res.rows[0] || null;
    } else {
      const store = fallbackDb.getStore();
      return [...store.qr_sessions].reverse().find(
        s => s.user_id === userId && !s.is_revoked && new Date(s.expires_at) > now
      ) || null;
    }
  }

  async revokeUserSessions(userId) {
    if (db.getIsConnected()) {
      const sql = `
        UPDATE qr_sessions
        SET is_revoked = TRUE
        WHERE user_id = $1 AND is_revoked = FALSE
      `;
      await db.query(sql, [userId]);
    } else {
      const store = fallbackDb.getStore();
      store.qr_sessions.forEach(s => {
        if (s.user_id === userId) {
          s.is_revoked = true;
        }
      });
      fallbackDb.saveStore();
    }
    return true;
  }

  async updateLastAccessed(sessionId) {
    const now = new Date();
    if (db.getIsConnected()) {
      const sql = `UPDATE qr_sessions SET last_accessed = $1 WHERE id = $2`;
      await db.query(sql, [now, sessionId]);
    } else {
      const store = fallbackDb.getStore();
      const s = store.qr_sessions.find(item => item.id === sessionId);
      if (s) {
        s.last_accessed = now.toISOString();
        fallbackDb.saveStore();
      }
    }
  }
}

module.exports = new QrRepository();
