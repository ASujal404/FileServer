const db = require('../config/db');
const fallbackDb = require('../database/fallbackDb');

class UserRepository {
  async findByEmail(email) {
    if (db.getIsConnected()) {
      const res = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      return res.rows[0] || null;
    } else {
      const store = fallbackDb.getStore();
      return store.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
    }
  }

  async findById(id) {
    if (db.getIsConnected()) {
      const res = await db.query('SELECT id, name, email, role, is_disabled, created_at FROM users WHERE id = $1', [id]);
      return res.rows[0] || null;
    } else {
      const store = fallbackDb.getStore();
      const user = store.users.find(u => u.id === id);
      if (!user) return null;
      const { password_hash, ...rest } = user;
      return { is_disabled: false, ...rest };
    }
  }

  async create({ id, name, email, password_hash, role = 'user' }) {
    if (db.getIsConnected()) {
      const res = await db.query(
        `INSERT INTO users (id, name, email, password_hash, role, is_disabled)
         VALUES ($1, $2, $3, $4, $5, FALSE)
         RETURNING id, name, email, role, is_disabled, created_at`,
        [id, name, email, password_hash, role]
      );
      return res.rows[0];
    } else {
      const store = fallbackDb.getStore();
      const newUser = {
        id,
        name,
        email,
        password_hash,
        role,
        is_disabled: false,
        created_at: new Date().toISOString()
      };
      store.users.push(newUser);
      fallbackDb.saveStore();
      const { password_hash: ph, ...rest } = newUser;
      return rest;
    }
  }

  async getUsersExcept(excludeUserId) {
    if (db.getIsConnected()) {
      const res = await db.query('SELECT id, name, email, role, is_disabled FROM users WHERE id != $1 AND (is_disabled IS NOT TRUE) ORDER BY name ASC', [excludeUserId]);
      return res.rows;
    } else {
      const store = fallbackDb.getStore();
      const seen = new Set();
      const list = [];
      for (const u of store.users) {
        if (u.id !== excludeUserId && !u.is_disabled && !seen.has(u.id)) {
          seen.add(u.id);
          const { password_hash, ...rest } = u;
          list.push({ is_disabled: false, ...rest });
        }
      }
      return list;
    }
  }

  async searchUsers(query, excludeUserId) {
    if (db.getIsConnected()) {
      let sql = `SELECT id, name, email, role, is_disabled FROM users WHERE id != $1 AND (is_disabled IS NOT TRUE)`;
      const params = [excludeUserId];
      if (query && query.trim()) {
        params.push(`%${query.trim()}%`);
        sql += ` AND (LOWER(name) LIKE LOWER($2) OR LOWER(email) LIKE LOWER($2))`;
      }
      sql += ` ORDER BY name ASC LIMIT 50`;
      const res = await db.query(sql, params);
      return res.rows;
    } else {
      const store = fallbackDb.getStore();
      const seen = new Set();
      let list = store.users.filter(u => {
        if (u.id === excludeUserId || u.is_disabled || seen.has(u.id)) return false;
        seen.add(u.id);
        return true;
      });
      if (query && query.trim()) {
        const q = query.trim().toLowerCase();
        list = list.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
      }
      return list.map(({ password_hash, ...u }) => ({ is_disabled: false, ...u }));
    }
  }

  async getAllUsers() {
    if (db.getIsConnected()) {
      const res = await db.query('SELECT id, name, email, role, is_disabled, created_at FROM users ORDER BY created_at DESC');
      return res.rows;
    } else {
      const store = fallbackDb.getStore();
      return store.users.map(({ password_hash, ...u }) => ({ is_disabled: false, ...u }));
    }
  }

  async countUsers() {
    if (db.getIsConnected()) {
      const res = await db.query('SELECT COUNT(*)::int as count FROM users');
      return res.rows[0].count;
    } else {
      return fallbackDb.getStore().users.length;
    }
  }

  async setUserDisabledStatus(id, isDisabled) {
    if (db.getIsConnected()) {
      const res = await db.query(
        'UPDATE users SET is_disabled = $1 WHERE id = $2 RETURNING id, name, email, role, is_disabled',
        [isDisabled, id]
      );
      return res.rows[0] || null;
    } else {
      const store = fallbackDb.getStore();
      const user = store.users.find(u => u.id === id);
      if (user) {
        user.is_disabled = isDisabled;
        fallbackDb.saveStore();
        const { password_hash, ...rest } = user;
        return rest;
      }
      return null;
    }
  }

  async deleteUser(id) {
    if (db.getIsConnected()) {
      const res = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
      return res.rows.length > 0;
    } else {
      const store = fallbackDb.getStore();
      const index = store.users.findIndex(u => u.id === id);
      if (index !== -1) {
        store.users.splice(index, 1);
        fallbackDb.saveStore();
        return true;
      }
      return false;
    }
  }
}

module.exports = new UserRepository();
