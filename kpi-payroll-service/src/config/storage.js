const { Storage } = require('@google-cloud/storage');

const keyFilename = process.env.GCP_KEY_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS || null;

let storage;
let bucket;

try {
  const storageOptions = keyFilename ? { keyFilename } : {};
  storage = new Storage(storageOptions);

  const bucketName = process.env.GCS_BUCKET_NAME;

  if (!bucketName) {
    console.warn('[storage] WARNING: GCS_BUCKET_NAME is not set. PDF upload features will not work.');
    bucket = null;
  } else {
    bucket = storage.bucket(bucketName);
  }

  if (!keyFilename) {
    console.warn('[storage] No explicit key file configured. Using Application Default Credentials (ADC).');
  }
} catch (err) {
  console.error('[storage] Failed to initialize Google Cloud Storage client:', err.message);
  storage = null;
  bucket = null;
}

module.exports = { storage, bucket };
