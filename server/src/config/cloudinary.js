const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');

const PLACEHOLDERS = new Set([
  '',
  'your-cloud-name',
  'your-api-key',
  'your-api-secret',
  'replace-me',
]);

const hasIndividualCredentials = () => [
  process.env.CLOUDINARY_CLOUD_NAME,
  process.env.CLOUDINARY_API_KEY,
  process.env.CLOUDINARY_API_SECRET,
].every((value) => value && !PLACEHOLDERS.has(String(value).trim()));

const hasCloudinaryUrl = () => {
  const value = String(process.env.CLOUDINARY_URL || '').trim();
  return value.startsWith('cloudinary://') && !value.includes('replace-me');
};

const isConfigured = () => hasIndividualCredentials() || hasCloudinaryUrl();

const isRequired = () => process.env.CLOUDINARY_REQUIRED === 'true'
  || (process.env.NODE_ENV === 'production' && process.env.MEDIA_STORAGE_PROVIDER === 'cloudinary');

const configure = () => {
  if (!isConfigured()) {
    if (isRequired()) {
      throw new Error('Cloudinary is required but its credentials are missing');
    }
    logger.warn('Cloudinary is not configured; local storage is enabled for non-production use');
    return false;
  }

  if (hasIndividualCredentials()) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  } else {
    // The SDK reads CLOUDINARY_URL automatically. Never log this value.
    cloudinary.config({ secure: true });
  }

  return true;
};

const assertReady = () => {
  if (!configure()) throw new Error('Cloudinary is not configured');
};

const verifyConnection = async () => {
  assertReady();
  await cloudinary.api.ping();
  return true;
};

module.exports = {
  cloudinary,
  configure,
  assertReady,
  verifyConnection,
  isConfigured,
  isRequired,
};
