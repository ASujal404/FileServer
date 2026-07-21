const fs = require('fs');
const { minioClient, MINIO_BUCKET, getMinioStatus, initMinio } = require('../config/minio');

class MinioService {

  async uploadFile(objectName, filePath, metaData = {}) {

    console.log("\n==============================");
    console.log(" MinIO Upload Started");
    console.log("==============================");
    console.log("Object Name:", objectName);
    console.log("File Path:", filePath);

    const isOnline = getMinioStatus() || (await initMinio());

    console.log("MinIO Online:", isOnline);

    if (!isOnline) {
      throw new Error('MinIO Storage Server is offline.');
    }

    if (!fs.existsSync(filePath)) {
      console.error("❌ File not found:", filePath);
      throw new Error("Local file does not exist.");
    }

    const stat = fs.statSync(filePath);

    console.log("File Size:", stat.size, "bytes");

    return new Promise((resolve, reject) => {

      minioClient.fPutObject(
        MINIO_BUCKET,
        objectName,
        filePath,
        metaData,
        (err, etag) => {

          if (err) {
            console.error("❌ MinIO Upload Failed");
            console.error(err);
            return reject(err);
          }

          console.log("✅ Upload Successful");
          console.log("Bucket:", MINIO_BUCKET);
          console.log("Object:", objectName);
          console.log("ETag:", etag);

          resolve({
            bucket: MINIO_BUCKET,
            objectName,
            etag,
            size: stat.size
          });

        }
      );

    });

  }

  async getObjectStream(objectName, offset = 0, length = 0) {
    const isOnline = getMinioStatus() || (await initMinio());

    if (!isOnline) {
      throw new Error('MinIO Storage Server is offline.');
    }

    if (offset > 0 || length > 0) {
      return await minioClient.getPartialObject(
        MINIO_BUCKET,
        objectName,
        offset,
        length
      );
    }

    return await minioClient.getObject(MINIO_BUCKET, objectName);
  }

  async copyObject(sourceObjectName, destObjectName) {
    const isOnline = getMinioStatus() || (await initMinio());

    if (!isOnline) {
      throw new Error('MinIO Storage Server is offline.');
    }

    const { CopyConditions } = require('minio');
    const conds = new CopyConditions();

    return new Promise((resolve, reject) => {
      minioClient.copyObject(
        MINIO_BUCKET,
        destObjectName,
        `/${MINIO_BUCKET}/${sourceObjectName}`,
        conds,
        (err, result) => {

          if (err) {
            console.error(" Copy Failed:", err);
            return reject(err);
          }

          console.log(" Copy Successful");

          resolve(result);
        }
      );
    });
  }

  async removeObject(objectName) {
    const isOnline = getMinioStatus();

    if (!isOnline) return false;

    return new Promise((resolve, reject) => {

      minioClient.removeObject(MINIO_BUCKET, objectName, (err) => {

        if (err) {
          console.error("❌ Delete Failed:", err);
          return reject(err);
        }

        console.log(" Object Deleted:", objectName);

        resolve(true);

      });

    });

  }

  async getMinioStorageStats() {

    try {
      const isOnline = await initMinio();

      if (!isOnline) {
        return {
          status: 'OFFLINE',
          message: 'Storage Server Offline',
          bucketName: MINIO_BUCKET,
          objectCount: 0,
          usedBytes: 0
        };
      }

      return new Promise((resolve) => {
        let objectCount = 0;
        let usedBytes = 0;

        const stream = minioClient.listObjectsV2(
          MINIO_BUCKET,
          '',
          true
        );

        stream.on('data', (obj) => {
          objectCount++;
          usedBytes += obj.size || 0;
        });

        stream.on('error', (err) => {
          console.error("Storage Stats Error:", err);
          resolve({
            status: 'OFFLINE',
            message: 'Storage Server Offline',
            bucketName: MINIO_BUCKET,
            objectCount: 0,
            usedBytes: 0
          });
        });

        stream.on('end', () => {
          console.log(" MinIO Storage Stats Loaded");
          resolve({
            status: 'ONLINE',
            message: 'MinIO Storage Server Operational',
            bucketName: MINIO_BUCKET,
            objectCount,
            usedBytes
          });
        });
      });
    } catch (err) {
      console.error(err);
      return {
        status: 'OFFLINE',
        message: 'Storage Server Offline',
        bucketName: MINIO_BUCKET,
        objectCount: 0,
        usedBytes: 0
      };
    }

  }

}

module.exports = new MinioService();