const { Storage } = require('@google-cloud/storage');

// Path to the service account key file.
// Accepts GCP_KEY_FILE (project-specific) or GOOGLE_APPLICATION_CREDENTIALS (ADC standard).
const keyFilename = process.env.GCP_KEY_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS || null;

let storage;
let bucket;

try {
  // Build Storage client options.
  // If no key file is provided, the client will attempt Application Default Credentials (ADC).
  const storageOptions = keyFilename ? { keyFilename } : {};

  storage = new Storage(storageOptions);

  const bucketName = process.env.GCS_BUCKET_NAME;

  if (!bucketName) {
    console.warn(
      '[storage] WARNING: GCS_BUCKET_NAME is not set. ' +
        'File upload and download features will not work until this is configured.'
    );
    bucket = null;
  } else {
    bucket = storage.bucket(bucketName);
  }

  if (!keyFilename) {
    console.warn(
      '[storage] No explicit key file configured (GCP_KEY_FILE / GOOGLE_APPLICATION_CREDENTIALS). ' +
        'Using Application Default Credentials (ADC). ' +
        'Ensure the runtime environment has valid credentials.'
    );
  }
} catch (err) {
  console.error('[storage] Failed to initialize Google Cloud Storage client:', err.message);
  // Export null values so that the rest of the application can still import this module
  // without crashing. Callers should check for null before using storage/bucket.
  storage = null;
  bucket = null;
}

module.exports = { storage, bucket };
