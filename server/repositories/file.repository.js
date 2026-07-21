const db = require('../config/db');
const fallbackDb = require('../database/fallbackDb');

class FileRepository {
  async createFile({ id, owner_id, folder_id = null, original_filename, stored_filename, path, relative_path = '', parent_folder = 'ROOT', depth = 0, file_size, file_hash, version = 1 }) {
    if (db.getIsConnected()) {
      const sql = `
        INSERT INTO files (id, owner_id, folder_id, original_filename, stored_filename, path, relative_path, parent_folder, depth, file_size, file_hash, version)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *;
      `;
      const res = await db.query(sql, [id, owner_id, folder_id, original_filename, stored_filename, path, relative_path, parent_folder, depth, file_size, file_hash, version]);
      return res.rows[0];
    } else {
      const store = fallbackDb.getStore();
      const newFile = {
        id,
        owner_id,
        folder_id,
        original_filename,
        stored_filename,
        path,
        relative_path,
        parent_folder,
        depth: parseInt(depth, 10),
        file_size: parseInt(file_size, 10),
        file_hash,
        upload_time: new Date().toISOString(),
        version: parseInt(version, 10),
        is_locked: false,
        locked_by: null,
        locked_at: null
      };
      store.files.push(newFile);
      fallbackDb.saveStore();
      return newFile;
    }
  }

  async findById(id) {
    if (db.getIsConnected()) {
      const sql = `
        SELECT f.*, u.name as owner_name, u.email as owner_email
        FROM files f
        JOIN users u ON f.owner_id = u.id
        WHERE f.id = $1;
      `;
      const res = await db.query(sql, [id]);
      return res.rows[0] || null;
    } else {
      const store = fallbackDb.getStore();
      const file = store.files.find(f => f.id === id);
      if (!file) return null;
      const owner = store.users.find(u => u.id === file.owner_id);
      return {
        ...file,
        owner_name: owner ? owner.name : 'Unknown User',
        owner_email: owner ? owner.email : ''
      };
    }
  }

  async findByOwner(owner_id) {
    if (db.getIsConnected()) {
      const sql = `
        SELECT f.*, COALESCE(u.name, 'Unknown User') as owner_name, COALESCE(u.email, '') as owner_email
        FROM files f
        LEFT JOIN users u ON f.owner_id = u.id
        WHERE f.owner_id = $1
        ORDER BY f.upload_time DESC;
      `;
      const res = await db.query(sql, [owner_id]);
      return res.rows;
    } else {
      const store = fallbackDb.getStore();
      const owner = store.users.find(u => u.id === owner_id);
      return store.files
        .filter(f => f.owner_id === owner_id)
        .map(f => ({
          ...f,
          owner_name: owner ? owner.name : 'Unknown User',
          owner_email: owner ? owner.email : ''
        }))
        .sort((a, b) => new Date(b.upload_time) - new Date(a.upload_time));
    }
  }

  async findByRelativePathPrefix(owner_id, relative_path_prefix) {
    if (db.getIsConnected()) {
      const sql = `
        SELECT f.*, u.name as owner_name, u.email as owner_email
        FROM files f
        JOIN users u ON f.owner_id = u.id
        WHERE f.owner_id = $1 AND (f.relative_path = $2 OR f.relative_path LIKE $3);
      `;
      const res = await db.query(sql, [owner_id, relative_path_prefix, `${relative_path_prefix}/%`]);
      return res.rows;
    } else {
      const store = fallbackDb.getStore();
      return store.files.filter(f => f.owner_id === owner_id && f.relative_path && (f.relative_path === relative_path_prefix || f.relative_path.startsWith(`${relative_path_prefix}/`)));
    }
  }

  async findAll() {
    if (db.getIsConnected()) {
      const sql = `
        SELECT f.*, u.name as owner_name, u.email as owner_email
        FROM files f
        JOIN users u ON f.owner_id = u.id
        ORDER BY f.upload_time DESC;
      `;
      const res = await db.query(sql);
      return res.rows;
    } else {
      const store = fallbackDb.getStore();
      return store.files
        .map(f => {
          const owner = store.users.find(u => u.id === f.owner_id);
          return {
            ...f,
            owner_name: owner ? owner.name : 'System Admin',
            owner_email: owner ? owner.email : ''
          };
        })
        .sort((a, b) => new Date(b.upload_time) - new Date(a.upload_time));
    }
  }

  async findByHash(file_hash, owner_id = null) {
    if (db.getIsConnected()) {
      let sql = `SELECT * FROM files WHERE file_hash = $1`;
      const params = [file_hash];
      if (owner_id) {
        sql += ` AND owner_id = $2`;
        params.push(owner_id);
      }
      const res = await db.query(sql, params);
      return res.rows;
    } else {
      const store = fallbackDb.getStore();
      return store.files.filter(f => f.file_hash === file_hash && (!owner_id || f.owner_id === owner_id));
    }
  }

  async findAnyByHash(file_hash) {
    if (db.getIsConnected()) {
      const sql = `SELECT * FROM files WHERE file_hash = $1 LIMIT 1`;
      const res = await db.query(sql, [file_hash]);
      return res.rows[0] || null;
    } else {
      const store = fallbackDb.getStore();
      return store.files.find(f => f.file_hash === file_hash) || null;
    }
  }

  async findHighestVersion(owner_id, original_filename) {
    if (db.getIsConnected()) {
      const sql = `
        SELECT MAX(version) as max_version
        FROM files
        WHERE owner_id = $1 AND original_filename = $2;
      `;
      const res = await db.query(sql, [owner_id, original_filename]);
      return res.rows[0]?.max_version || 0;
    } else {
      const store = fallbackDb.getStore();
      const matches = store.files.filter(f => f.owner_id === owner_id && f.original_filename === original_filename);
      if (matches.length === 0) return 0;
      return Math.max(...matches.map(m => m.version || 1));
    }
  }

  async updateName(id, newOriginalFilename) {
    if (db.getIsConnected()) {
      const sql = `
        UPDATE files
        SET original_filename = $1
        WHERE id = $2
        RETURNING *;
      `;
      const res = await db.query(sql, [newOriginalFilename, id]);
      return res.rows[0];
    } else {
      const store = fallbackDb.getStore();
      const file = store.files.find(f => f.id === id);
      if (file) {
        file.original_filename = newOriginalFilename;
        fallbackDb.saveStore();
        return file;
      }
      return null;
    }
  }

  async setLock(id, is_locked, locked_by = null) {
    const locked_at = is_locked ? new Date().toISOString() : null;
    if (db.getIsConnected()) {
      const sql = `
        UPDATE files
        SET is_locked = $1, locked_by = $2, locked_at = $3
        WHERE id = $4
        RETURNING *;
      `;
      const res = await db.query(sql, [is_locked, locked_by, locked_at, id]);
      return res.rows[0];
    } else {
      const store = fallbackDb.getStore();
      const file = store.files.find(f => f.id === id);
      if (file) {
        file.is_locked = is_locked;
        file.locked_by = locked_by;
        file.locked_at = locked_at;
        fallbackDb.saveStore();
        return file;
      }
      return null;
    }
  }

  async deleteById(id) {
    if (db.getIsConnected()) {
      const sql = `DELETE FROM files WHERE id = $1 RETURNING *;`;
      const res = await db.query(sql, [id]);
      return res.rows[0] || null;
    } else {
      const store = fallbackDb.getStore();
      const idx = store.files.findIndex(f => f.id === id);
      if (idx !== -1) {
        const deleted = store.files.splice(idx, 1)[0];
        fallbackDb.saveStore();
        return deleted;
      }
      return null;
    }
  }

  async searchFiles({ query, extension, owner_id, owner_name, start_date, end_date }, user) {
    let files = user.role === 'admin' ? await this.findAll() : await this.findByOwner(user.id);
    
    if (query) {
      const q = query.toLowerCase();
      files = files.filter(f => f.original_filename.toLowerCase().includes(q) || (f.relative_path && f.relative_path.toLowerCase().includes(q)));
    }

    if (extension) {
      const ext = extension.toLowerCase().replace('.', '');
      files = files.filter(f => {
        const fileExt = f.original_filename.split('.').pop().toLowerCase();
        return fileExt === ext;
      });
    }

    if (owner_name && user.role === 'admin') {
      const o = owner_name.toLowerCase();
      files = files.filter(f => f.owner_name && f.owner_name.toLowerCase().includes(o));
    }

    if (start_date) {
      const s = new Date(start_date);
      files = files.filter(f => new Date(f.upload_time) >= s);
    }

    if (end_date) {
      const e = new Date(end_date);
      files = files.filter(f => new Date(f.upload_time) <= e);
    }

    return files;
  }

  async getTotalStorageUsed() {
    if (db.getIsConnected()) {
      const sql = `SELECT COALESCE(SUM(file_size), 0)::bigint as total FROM files;`;
      const res = await db.query(sql);
      return parseInt(res.rows[0].total, 10);
    } else {
      const store = fallbackDb.getStore();
      return store.files.reduce((acc, f) => acc + (parseInt(f.file_size, 10) || 0), 0);
    }
  }

  async countFiles() {
    if (db.getIsConnected()) {
      const sql = `SELECT COUNT(*)::int as count FROM files;`;
      const res = await db.query(sql);
      return res.rows[0].count;
    } else {
      return fallbackDb.getStore().files.length;
    }
  }
}

module.exports = new FileRepository();
