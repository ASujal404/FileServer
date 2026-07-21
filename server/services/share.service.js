const { v4: uuidv4 } = require('uuid');
const shareRepository = require('../repositories/share.repository');
const folderRepository = require('../repositories/folder.repository');
const fileRepository = require('../repositories/file.repository');
const userRepository = require('../repositories/user.repository');
const auditRepository = require('../repositories/audit.repository');
const { AUDIT_ACTIONS } = require('../config/constants');

class ShareService {
  async shareFolder({ folderId, ownerUser, targetUserIds, permission = 'viewer' }) {
    const rootFolder = await folderRepository.findById(folderId);
    if (!rootFolder) throw new Error('Folder not found.');

    const isOwner = rootFolder.owner_id === ownerUser.id;
    const isAdmin = ownerUser.role === 'admin';
    let hasEditorPermission = false;
    if (!isOwner && !isAdmin) {
      const perm = await shareRepository.getFolderSharePermission(folderId, ownerUser.id);
      hasEditorPermission = (perm === 'editor');
    }

    if (!isOwner && !isAdmin && !hasEditorPermission) {
      throw new Error('Forbidden. You do not have permission to share this folder.');
    }

    // Find all recursive child subfolders and files under rootFolder.relative_path
    const allOwnerFolders = await folderRepository.findByOwner(rootFolder.owner_id);
    const childFolders = allOwnerFolders.filter(f => f.relative_path === rootFolder.relative_path || f.relative_path.startsWith(`${rootFolder.relative_path}/`));

    const childFiles = await fileRepository.findByRelativePathPrefix(rootFolder.owner_id, rootFolder.relative_path);

    const sharedResults = [];

    for (const targetUserId of targetUserIds) {
      if (targetUserId === ownerUser.id) {
        console.warn(`[Share Security Block] Prevented user ${ownerUser.name} (${ownerUser.id}) from sharing folder with self.`);
        continue;
      }
      const targetUser = await userRepository.findById(targetUserId);
      if (!targetUser || targetUser.is_disabled) continue;

      // 1. Share root folder & subfolders
      for (const folder of childFolders) {
        await shareRepository.shareFolder({
          id: uuidv4(),
          folder_id: folder.id,
          owner_id: rootFolder.owner_id,
          shared_with_user_id: targetUserId,
          permission
        });
      }

      // 2. Share all child files with inherited_from_folder
      for (const file of childFiles) {
        await shareRepository.shareFile({
          id: uuidv4(),
          file_id: file.id,
          owner_id: rootFolder.owner_id,
          shared_with_user_id: targetUserId,
          permission,
          inherited_from_folder: rootFolder.id
        });
      }

      // 3. Create Audit Log
      await auditRepository.log({
        user_id: ownerUser.id,
        user_name: ownerUser.name,
        action: 'SHARE_FOLDER',
        filename: rootFolder.name,
        details: `Shared folder '${rootFolder.name}' (${childFiles.length} files) with ${targetUser.name} [Permission: ${permission}]`
      });

      sharedResults.push({ userId: targetUserId, userName: targetUser.name });
    }

    return {
      folder: rootFolder,
      sharedWith: sharedResults,
      permission
    };
  }

  async shareFile({ fileId, ownerUser, targetUserIds, permission = 'viewer' }) {
    const file = await fileRepository.findById(fileId);
    if (!file) throw new Error('File not found.');

    const isOwner = file.owner_id === ownerUser.id;
    const isAdmin = ownerUser.role === 'admin';
    let hasEditorPermission = false;
    if (!isOwner && !isAdmin) {
      const perm = await shareRepository.getFileSharePermission(fileId, ownerUser.id);
      hasEditorPermission = (perm === 'editor');
    }

    if (!isOwner && !isAdmin && !hasEditorPermission) {
      throw new Error('Forbidden. You do not have permission to share this file.');
    }

    const sharedResults = [];

    for (const targetUserId of targetUserIds) {
      if (targetUserId === ownerUser.id) {
        console.warn(`[Share Security Block] Prevented user ${ownerUser.name} (${ownerUser.id}) from sharing file with self.`);
        continue;
      }
      const targetUser = await userRepository.findById(targetUserId);
      if (!targetUser || targetUser.is_disabled) continue;

      await shareRepository.shareFile({
        id: uuidv4(),
        file_id: file.id,
        owner_id: file.owner_id,
        shared_with_user_id: targetUserId,
        permission,
        inherited_from_folder: null
      });

      // Audit Log
      await auditRepository.log({
        user_id: ownerUser.id,
        user_name: ownerUser.name,
        action: 'SHARE_FILE',
        filename: file.original_filename,
        details: `Shared file '${file.original_filename}' with ${targetUser.name} [Permission: ${permission}]`
      });

      sharedResults.push({ userId: targetUserId, userName: targetUser.name });
    }

    return {
      file,
      sharedWith: sharedResults,
      permission
    };
  }

  async revokeFolderShare(folderId, ownerUser, targetUserId) {
    const folder = await folderRepository.findById(folderId);
    if (!folder) throw new Error('Folder not found.');

    const isOwner = folder.owner_id === ownerUser.id;
    const isAdmin = ownerUser.role === 'admin';
    let hasEditorPermission = false;
    if (!isOwner && !isAdmin) {
      const perm = await shareRepository.getFolderSharePermission(folderId, ownerUser.id);
      hasEditorPermission = (perm === 'editor');
    }

    if (!isOwner && !isAdmin && !hasEditorPermission) {
      throw new Error('Forbidden. You do not have permission to revoke share access for this folder.');
    }

    await shareRepository.revokeFolderShare(folderId, targetUserId);

    await auditRepository.log({
      user_id: ownerUser.id,
      user_name: ownerUser.name,
      action: 'REVOKE_SHARE',
      filename: folder.name,
      details: `Revoked folder share access for user ID: ${targetUserId}`
    });

    return true;
  }

  async revokeFileShare(fileId, ownerUser, targetUserId) {
    const file = await fileRepository.findById(fileId);
    if (!file) throw new Error('File not found.');

    const isOwner = file.owner_id === ownerUser.id;
    const isAdmin = ownerUser.role === 'admin';
    let hasEditorPermission = false;
    if (!isOwner && !isAdmin) {
      const perm = await shareRepository.getFileSharePermission(fileId, ownerUser.id);
      hasEditorPermission = (perm === 'editor');
    }

    if (!isOwner && !isAdmin && !hasEditorPermission) {
      throw new Error('Forbidden. You do not have permission to revoke share access for this file.');
    }

    await shareRepository.revokeFileShare(fileId, targetUserId);

    await auditRepository.log({
      user_id: ownerUser.id,
      user_name: ownerUser.name,
      action: 'REVOKE_SHARE',
      filename: file.original_filename,
      details: `Revoked file share access for user ID: ${targetUserId}`
    });

    return true;
  }

  async getSharedWithMe(userId) {
    const folders = await shareRepository.getSharedFoldersForUser(userId);
    const files = await shareRepository.getSharedFilesForUser(userId);

    return {
      folders,
      files
    };
  }

  async getSharedUsers(itemId, isFolder) {
    if (isFolder) {
      return await shareRepository.getSharedUsersForFolder(itemId);
    } else {
      return await shareRepository.getSharedUsersForFile(itemId);
    }
  }
}

module.exports = new ShareService();
