const Minio = require('minio');
const {
  MINIO_ENDPOINT,
  MINIO_PORT,
  MINIO_USE_SSL,
  MINIO_ACCESS_KEY,
  MINIO_SECRET_KEY,
  MINIO_BUCKET
} = require('./constants');

const minioClient = new Minio.Client({
  endPoint: MINIO_ENDPOINT,
  port: MINIO_PORT,
  useSSL: MINIO_USE_SSL,
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY
});

let isMinioOnline = false;

async function initMinio() {
  try {
    const exists = await minioClient.bucketExists(MINIO_BUCKET);
    if (!exists) {
      await minioClient.makeBucket(MINIO_BUCKET, 'us-east-1');
      console.log(`[MinIO Object Storage] Created bucket '${MINIO_BUCKET}' successfully.`);
    } else {
      console.log(`[MinIO Object Storage] Bucket '${MINIO_BUCKET}' verified.`);
    }
    isMinioOnline = true;
    return true;
  } catch (err) {
    console.warn(`[MinIO Object Storage Notice] MinIO server offline or unreachable (${err.message}). Falling back to local storage if offline.`);
    isMinioOnline = false;
    return false;
  }
}

function getMinioStatus() {
  return isMinioOnline;
}

// Initial bucket setup attempt on server startup
initMinio();

module.exports = {
  minioClient,
  initMinio,
  getMinioStatus,
  MINIO_BUCKET
};
