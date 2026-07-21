const fileRepository = require('../repositories/file.repository');
const userRepository = require('../repositories/user.repository');
const minioService = require('../services/minio.service');

class StorageController {
  async getStorageInfo(req, res, next) {
    try {
      // Live MinIO Storage Server metrics
      const minioStats = await minioService.getMinioStorageStats();

      const dbUsedBytes = await fileRepository.getTotalStorageUsed();
      const fileCount = await fileRepository.countFiles();
      const userCount = await userRepository.countUsers();
      
      const usedBytes = minioStats.status === 'ONLINE' ? minioStats.usedBytes : dbUsedBytes;
      const objectCount = minioStats.status === 'ONLINE' ? minioStats.objectCount : fileCount;

      // Category breakdown
      const files = req.user.role === 'admin' ? await fileRepository.findAll() : await fileRepository.findByOwner(req.user.id);
      
      const breakdown = {};
      files.forEach(f => {
        const ext = (f.original_filename.split('.').pop() || 'other').toLowerCase();
        if (!breakdown[ext]) {
          breakdown[ext] = { count: 0, bytes: 0 };
        }
        breakdown[ext].count += 1;
        breakdown[ext].bytes += parseInt(f.file_size, 10);
      });

      return res.status(200).json({
        success: true,
        storage: {
          status: minioStats.status,
          message: minioStats.status === 'ONLINE' ? 'MinIO Operational' : 'Storage Server Offline',
          bucketName: minioStats.bucketName || 'fileserver-storage',
          usedBytes,
          objectCount,
          fileCount,
          userCount,
          breakdown
        }
      });
    } catch (err) {
      return res.status(200).json({
        success: true,
        storage: {
          status: 'OFFLINE',
          message: 'Storage Server Offline',
          bucketName: 'fileserver-storage',
          usedBytes: 0,
          objectCount: 0,
          fileCount: 0,
          userCount: 0,
          breakdown: {}
        }
      });
    }
  }
}

module.exports = new StorageController();
