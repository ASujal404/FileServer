const db = require('../config/db');
const fallbackDb = require('../database/fallbackDb');

class FolderRepository {
  async createFolder({ id, owner_id, name, relative_path, parent_folder = 'ROOT', depth = 0, version = 1 }) {
    if (db.getIsConnected()) {
      const sql = `
        INSERT INTO folders (id, owner_id, name, relative_path, parent_folder, depth, version)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `;
      const res = await db.query(sql, [id, owner_id, name, relative_path, parent_folder, depth, version]);
      return res.rows[0];
    } else {
      const store = fallbackDb.getStore();
      const newFolder = {
        id,
        owner_id,
        name,
        relative_path,
        parent_folder,
        depth: parseInt(depth, 10),
        version: parseInt(version, 10),
        is_locked: false,
        locked_by: null,
        locked_at: null,
        created_at: new Date().toISOString()
      };
      store.folders.push(newFolder);
      fallbackDb.saveStore();
      return newFolder;
    }
  }

  async findById(id) {
    if (db.getIsConnected()) {
      const sql = `
        SELECT f.*, u.name as owner_name, u.email as owner_email
        FROM folders f
        JOIN users u ON f.owner_id = u.id
        WHERE f.id = $1;
      `;
      const res = await db.query(sql, [id]);
      return res.rows[0] || null;
    } else {
      const store = fallbackDb.getStore();
      const folder = store.folders.find(f => f.id === id);
      if (!folder) return null;
      const owner = store.users.find(u => u.id === folder.owner_id);
      return {
        ...folder,
        owner_name: owner ? owner.name : 'Unknown User',
        owner_email: owner ? owner.email : ''
      };
    }
  }

  async findByOwner(owner_id) {
    if (db.getIsConnected()) {
      const sql = `
        SELECT f.*, u.name as owner_name, u.email as owner_email
        FROM folders f
        JOIN users u ON f.owner_id = u.id
        WHERE f.owner_id = $1
        ORDER BY f.depth ASC, f.name ASC;
      `;
      const res = await db.query(sql, [owner_id]);
      return res.rows;
    } else {
      const store = fallbackDb.getStore();
      return store.folders
        .filter(f => f.owner_id === owner_id)
        .map(f => {
          const owner = store.users.find(u => u.id === f.owner_id);
          return {
            ...f,
            owner_name: owner ? owner.name : 'Unknown User',
            owner_email: owner ? owner.email : ''
          };
        })
        .sort((a, b) => a.depth - b.depth || a.name.localeCompare(b.name));
    }
  }

  async findAll() {
    if (db.getIsConnected()) {
      const sql = `
        SELECT f.*, u.name as owner_name, u.email as owner_email
        FROM folders f
        JOIN users u ON f.owner_id = u.id
        ORDER BY f.depth ASC, f.name ASC;
      `;
      const res = await db.query(sql);
      return res.rows;
    } else {
      const store = fallbackDb.getStore();
      return store.folders.map(f => {
        const owner = store.users.find(u => u.id === f.owner_id);
        return {
          ...f,
          owner_name: owner ? owner.name : 'System Admin',
          owner_email: owner ? owner.email : ''
        };
      });
    }
  }

  async findByRelativePath(owner_id, relative_path) {
    if (db.getIsConnected()) {
      const sql = `SELECT * FROM folders WHERE owner_id = $1 AND relative_path = $2;`;
      const res = await db.query(sql, [owner_id, relative_path]);
      return res.rows[0] || null;
    } else {
      const store = fallbackDb.getStore();
      return store.folders.find(f => f.owner_id === owner_id && f.relative_path === relative_path) || null;
    }
  }

  async findHighestVersion(owner_id, name) {
    if (db.getIsConnected()) {
      const sql = `SELECT MAX(version) as max_version FROM folders WHERE owner_id = $1 AND name = $2;`;
      const res = await db.query(sql, [owner_id, name]);
      return res.rows[0]?.max_version || 0;
    } else {
      const store = fallbackDb.getStore();
      const matches = store.folders.filter(f => f.owner_id === owner_id && f.name === name);
      if (matches.length === 0) return 0;
      return Math.max(...matches.map(m => m.version || 1));
    }
  }

  async updateNameAndPaths(id, newName, oldRelativePath, newRelativePath) {
    if (db.getIsConnected()) {
      // 1. Update target folder
      await db.query(`UPDATE folders SET name = $1, relative_path = $2 WHERE id = $3`, [newName, newRelativePath, id]);
      
      // 2. Update child subfolders relative_path
      const sqlSubfolders = `
        UPDATE folders
        SET relative_path = REPLACE(relative_path, $1, $2)
        WHERE relative_path LIKE $3;
      `;
      await db.query(sqlSubfolders, [oldRelativePath, newRelativePath, `${oldRelativePath}/%`]);

      // 3. Update child files relative_path
      const sqlFiles = `
        UPDATE files
        SET relative_path = REPLACE(relative_path, $1, $2)
        WHERE relative_path LIKE $3;
      `;
      await db.query(sqlFiles, [oldRelativePath, newRelativePath, `${oldRelativePath}/%`]);

      const res = await db.query(`SELECT * FROM folders WHERE id = $1`, [id]);
      return res.rows[0];
    } else {
      const store = fallbackDb.getStore();
      const target = store.folders.find(f => f.id === id);
      if (target) {
        target.name = newName;
        target.relative_path = newRelativePath;

        // Cascade update subfolders & files
        store.folders.forEach(f => {
          if (f.relative_path.startsWith(`${oldRelativePath}/`)) {
            f.relative_path = f.relative_path.replace(oldRelativePath, newRelativePath);
          }
        });
        store.files.forEach(f => {
          if (f.relative_path && f.relative_path.startsWith(`${oldRelativePath}/`)) {
            f.relative_path = f.relative_path.replace(oldRelativePath, newRelativePath);
          }
        });
        fallbackDb.saveStore();
        return target;
      }
      return null;
    }
  }

  async setLock(id, is_locked, locked_by = null) {
    const locked_at = is_locked ? new Date().toISOString() : null;
    if (db.getIsConnected()) {
      const sql = `UPDATE folders SET is_locked = $1, locked_by = $2, locked_at = $3 WHERE id = $4 RETURNING *;`;
      const res = await db.query(sql, [is_locked, locked_by, locked_at, id]);
      return res.rows[0];
    } else {
      const store = fallbackDb.getStore();
      const folder = store.folders.find(f => f.id === id);
      if (folder) {
        folder.is_locked = is_locked;
        folder.locked_by = locked_by;
        folder.locked_at = locked_at;
        fallbackDb.saveStore();
        return folder;
      }
      return null;
    }
  }

  async updateSharing(id, sharedWithArray) {
    const store = fallbackDb.getStore();
    const folder = store.folders.find(f => f.id === id);
    if (folder) {
      folder.shared_with = JSON.stringify(sharedWithArray);
      fallbackDb.saveStore();
      return folder;
    }
    return null;
  }

  async deleteById(id) {
    if (db.getIsConnected()) {
      const sql = `DELETE FROM folders WHERE id = $1 RETURNING *;`;
      const res = await db.query(sql, [id]);
      return res.rows[0] || null;
    } else {
      const store = fallbackDb.getStore();
      const idx = store.folders.findIndex(f => f.id === id);
      if (idx !== -1) {
        const deleted = store.folders.splice(idx, 1)[0];
        fallbackDb.saveStore();
        return deleted;
      }
      return null;
    }
  }

  async deleteChildFoldersAndFiles(owner_id, relative_path) {
    if (db.getIsConnected()) {
      await db.query(`DELETE FROM files WHERE owner_id = $1 AND (relative_path = $2 OR relative_path LIKE $3);`, [owner_id, relative_path, `${relative_path}/%`]);
      await db.query(`DELETE FROM folders WHERE owner_id = $1 AND (relative_path = $2 OR relative_path LIKE $3);`, [owner_id, relative_path, `${relative_path}/%`]);
    } else {
      const store = fallbackDb.getStore();
      store.files = store.files.filter(f => f.owner_id !== owner_id || (!f.relative_path.startsWith(relative_path)));
      store.folders = store.folders.filter(f => f.owner_id !== owner_id || (!f.relative_path.startsWith(relative_path)));
      fallbackDb.saveStore();
    }
  }
}

module.exports = new FolderRepository();
