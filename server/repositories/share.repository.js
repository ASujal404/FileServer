const db = require('../config/db');
const fallbackDb = require('../database/fallbackDb');

class ShareRepository {
  async shareFolder({ id, folder_id, owner_id, shared_with_user_id, permission = 'viewer' }) {
    if (db.getIsConnected()) {
      const sql = `
        INSERT INTO shared_folders (id, folder_id, owner_id, shared_with_user_id, permission)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (folder_id, shared_with_user_id) 
        DO UPDATE SET permission = EXCLUDED.permission, shared_at = CURRENT_TIMESTAMP
        RETURNING *;
      `;
      const res = await db.query(sql, [id, folder_id, owner_id, shared_with_user_id, permission]);
      return res.rows[0];
    } else {
      const store = fallbackDb.getStore();
      let existing = store.shared_folders.find(sf => sf.folder_id === folder_id && sf.shared_with_user_id === shared_with_user_id);
      if (existing) {
        existing.permission = permission;
        existing.shared_at = new Date().toISOString();
      } else {
        existing = {
          id,
          folder_id,
          owner_id,
          shared_with_user_id,
          permission,
          shared_at: new Date().toISOString()
        };
        store.shared_folders.push(existing);
      }
      fallbackDb.saveStore();
      return existing;
    }
  }

  async shareFile({ id, file_id, owner_id, shared_with_user_id, permission = 'viewer', inherited_from_folder = null }) {
    if (db.getIsConnected()) {
      const sql = `
        INSERT INTO shared_files (id, file_id, owner_id, shared_with_user_id, permission, inherited_from_folder)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (file_id, shared_with_user_id)
        DO UPDATE SET permission = EXCLUDED.permission, inherited_from_folder = EXCLUDED.inherited_from_folder, shared_at = CURRENT_TIMESTAMP
        RETURNING *;
      `;
      const res = await db.query(sql, [id, file_id, owner_id, shared_with_user_id, permission, inherited_from_folder]);
      return res.rows[0];
    } else {
      const store = fallbackDb.getStore();
      let existing = store.shared_files.find(sf => sf.file_id === file_id && sf.shared_with_user_id === shared_with_user_id);
      if (existing) {
        existing.permission = permission;
        existing.inherited_from_folder = inherited_from_folder;
        existing.shared_at = new Date().toISOString();
      } else {
        existing = {
          id,
          file_id,
          owner_id,
          shared_with_user_id,
          permission,
          inherited_from_folder,
          shared_at: new Date().toISOString()
        };
        store.shared_files.push(existing);
      }
      fallbackDb.saveStore();
      return existing;
    }
  }

  async getSharedFoldersForUser(userId) {
    if (db.getIsConnected()) {
      const sql = `
        SELECT f.*, sf.permission, sf.shared_at, u.name as owner_name, u.name as shared_by, u.email as owner_email
        FROM shared_folders sf
        JOIN folders f ON sf.folder_id = f.id
        JOIN users u ON sf.owner_id = u.id
        WHERE sf.shared_with_user_id = $1
        ORDER BY sf.shared_at DESC;
      `;
      const res = await db.query(sql, [userId]);
      return res.rows;
    } else {
      const store = fallbackDb.getStore();
      const shares = store.shared_folders.filter(sf => sf.shared_with_user_id === userId);
      return shares.map(sf => {
        const folder = store.folders.find(f => f.id === sf.folder_id);
        const owner = store.users.find(u => u.id === sf.owner_id);
        return {
          ...(folder || {}),
          permission: sf.permission,
          shared_at: sf.shared_at,
          shared_by: owner ? owner.name : 'System Admin',
          owner_name: owner ? owner.name : 'System Admin',
          owner_email: owner ? owner.email : ''
        };
      }).filter(item => item.id);
    }
  }

  async getSharedFilesForUser(userId) {
    if (db.getIsConnected()) {
      const sql = `
        SELECT f.*, sf.permission, sf.shared_at, sf.inherited_from_folder, u.name as owner_name, u.name as shared_by, u.email as owner_email
        FROM shared_files sf
        JOIN files f ON sf.file_id = f.id
        JOIN users u ON sf.owner_id = u.id
        WHERE sf.shared_with_user_id = $1
        ORDER BY sf.shared_at DESC;
      `;
      const res = await db.query(sql, [userId]);
      return res.rows;
    } else {
      const store = fallbackDb.getStore();
      const shares = store.shared_files.filter(sf => sf.shared_with_user_id === userId);
      return shares.map(sf => {
        const file = store.files.find(f => f.id === sf.file_id);
        const owner = store.users.find(u => u.id === sf.owner_id);
        return {
          ...(file || {}),
          permission: sf.permission,
          shared_at: sf.shared_at,
          inherited_from_folder: sf.inherited_from_folder,
          shared_by: owner ? owner.name : 'System Admin',
          owner_name: owner ? owner.name : 'System Admin',
          owner_email: owner ? owner.email : ''
        };
      }).filter(item => item.id);
    }
  }

  async getSharedUsersForFolder(folderId) {
    if (db.getIsConnected()) {
      const sql = `
        SELECT sf.id as share_id, sf.permission, sf.shared_at, u.id as user_id, u.name, u.email, u.role
        FROM shared_folders sf
        JOIN users u ON sf.shared_with_user_id = u.id
        WHERE sf.folder_id = $1;
      `;
      const res = await db.query(sql, [folderId]);
      return res.rows;
    } else {
      const store = fallbackDb.getStore();
      const shares = store.shared_folders.filter(sf => sf.folder_id === folderId);
      return shares.map(sf => {
        const user = store.users.find(u => u.id === sf.shared_with_user_id);
        return {
          share_id: sf.id,
          permission: sf.permission,
          shared_at: sf.shared_at,
          user_id: user ? user.id : sf.shared_with_user_id,
          name: user ? user.name : 'Unknown User',
          email: user ? user.email : '',
          role: user ? user.role : 'user'
        };
      });
    }
  }

  async getSharedUsersForFile(fileId) {
    if (db.getIsConnected()) {
      const sql = `
        SELECT sf.id as share_id, sf.permission, sf.shared_at, u.id as user_id, u.name, u.email, u.role
        FROM shared_files sf
        JOIN users u ON sf.shared_with_user_id = u.id
        WHERE sf.file_id = $1 AND sf.inherited_from_folder IS NULL;
      `;
      const res = await db.query(sql, [fileId]);
      return res.rows;
    } else {
      const store = fallbackDb.getStore();
      const shares = store.shared_files.filter(sf => sf.file_id === fileId && !sf.inherited_from_folder);
      return shares.map(sf => {
        const user = store.users.find(u => u.id === sf.shared_with_user_id);
        return {
          share_id: sf.id,
          permission: sf.permission,
          shared_at: sf.shared_at,
          user_id: user ? user.id : sf.shared_with_user_id,
          name: user ? user.name : 'Unknown User',
          email: user ? user.email : '',
          role: user ? user.role : 'user'
        };
      });
    }
  }

  async revokeFolderShare(folderId, targetUserId) {
    if (db.getIsConnected()) {
      await db.query(`DELETE FROM shared_folders WHERE folder_id = $1 AND shared_with_user_id = $2`, [folderId, targetUserId]);
      await db.query(`DELETE FROM shared_files WHERE inherited_from_folder = $1 AND shared_with_user_id = $2`, [folderId, targetUserId]);
      return true;
    } else {
      const store = fallbackDb.getStore();
      store.shared_folders = store.shared_folders.filter(sf => !(sf.folder_id === folderId && sf.shared_with_user_id === targetUserId));
      store.shared_files = store.shared_files.filter(sf => !(sf.inherited_from_folder === folderId && sf.shared_with_user_id === targetUserId));
      fallbackDb.saveStore();
      return true;
    }
  }

  async revokeFileShare(fileId, targetUserId) {
    if (db.getIsConnected()) {
      await db.query(`DELETE FROM shared_files WHERE file_id = $1 AND shared_with_user_id = $2`, [fileId, targetUserId]);
      return true;
    } else {
      const store = fallbackDb.getStore();
      store.shared_files = store.shared_files.filter(sf => !(sf.file_id === fileId && sf.shared_with_user_id === targetUserId));
      fallbackDb.saveStore();
      return true;
    }
  }

  async getFolderSharePermission(folderId, userId) {
    if (db.getIsConnected()) {
      const res = await db.query(`SELECT permission FROM shared_folders WHERE folder_id = $1 AND shared_with_user_id = $2`, [folderId, userId]);
      return res.rows[0]?.permission || null;
    } else {
      const store = fallbackDb.getStore();
      const sf = store.shared_folders.find(s => s.folder_id === folderId && s.shared_with_user_id === userId);
      return sf ? sf.permission : null;
    }
  }

  async getFileSharePermission(fileId, userId) {
    if (db.getIsConnected()) {
      const sql = `
        SELECT permission FROM shared_files WHERE file_id = $1 AND shared_with_user_id = $2
        UNION
        SELECT sf.permission FROM shared_folders sf 
        JOIN files f ON f.folder_id = sf.folder_id 
        WHERE f.id = $1 AND sf.shared_with_user_id = $2
      `;
      const res = await db.query(sql, [fileId, userId]);
      return res.rows[0]?.permission || null;
    } else {
      const store = fallbackDb.getStore();
      const sharedFiles = store.shared_files || [];
      const sharedFolders = store.shared_folders || [];

      const direct = sharedFiles.find(s => s.file_id === fileId && s.shared_with_user_id === userId);
      if (direct) return direct.permission;

      const file = store.files.find(f => f.id === fileId);
      if (file) {
        if (file.folder_id) {
          const folderShare = sharedFolders.find(s => s.folder_id === file.folder_id && s.shared_with_user_id === userId);
          if (folderShare) return folderShare.permission;
        }
        if (file.parent_folder && file.parent_folder !== 'ROOT') {
          const parentFolder = store.folders.find(f => f.name === file.parent_folder || f.relative_path === file.parent_folder);
          if (parentFolder) {
            const parentShare = sharedFolders.find(s => s.folder_id === parentFolder.id && s.shared_with_user_id === userId);
            if (parentShare) return parentShare.permission;
          }
        }
      }
      return null;
    }
  }
}

module.exports = new ShareRepository();
