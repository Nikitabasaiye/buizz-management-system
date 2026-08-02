const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const cloudinaryConfig = require('./cloudinary');

const storageRoot = path.join(__dirname, '../../storage/kyc-documents');
const uploadFolders = {
  pan: 'pan',
  address_proof: 'address-proof',
  aadhaar: 'aadhaar',
  cancelled_cheque_or_passbook: 'bank-documents',
};

for (const directory of ['', ...new Set(Object.values(uploadFolders))]) {
  fs.mkdirSync(path.join(storageRoot, directory), { recursive: true });
}

const sanitizeSegment = (value, fallback = 'general') => {
  const cleaned = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || fallback;
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    const documentType = sanitizeSegment(req.body.documentType);
    const folder = uploadFolders[documentType]
      || (documentType.includes('bank') ? 'bank-documents' : '');
    const destination = path.join(storageRoot, folder);
    fs.mkdirSync(destination, { recursive: true });
    callback(null, destination);
  },
  filename: (req, file, callback) => {
    const userId = sanitizeSegment(req.user?.id, 'unknown');
    const documentType = sanitizeSegment(req.body.documentType, 'document');
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${userId}_${documentType}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}${extension}`);
  },
});

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
]);
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.webp']);

const fileFilter = (req, file, callback) => {
  const extension = path.extname(file.originalname).toLowerCase();
  if (allowedMimeTypes.has(file.mimetype) && allowedExtensions.has(extension)) {
    callback(null, true);
    return;
  }
  callback(new AppError('Invalid file type. Only JPG, PNG, GIF, PDF, and WEBP are allowed', 400), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: Number(process.env.MAX_UPLOAD_BYTES || 5 * 1024 * 1024) },
});

const uploadToCloudinary = async (filePath, folder = 'documents', options = {}) => {
  if (!cloudinaryConfig.isConfigured()) {
    if (cloudinaryConfig.isRequired()) throw new Error('Cloudinary is required but not configured');
    return null;
  }

  cloudinaryConfig.assertReady();
  const deliveryType = options.type || (options.private ? 'authenticated' : 'upload');
  const result = await cloudinaryConfig.cloudinary.uploader.upload(filePath, {
    folder: `buizz/${String(folder).replace(/^\/+|\/+$/g, '')}`,
    resource_type: options.resourceType || options.resource_type || 'auto',
    type: deliveryType,
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'gif', 'webp'],
    use_filename: false,
    unique_filename: true,
    overwrite: false,
    invalidate: true,
    context: options.context,
  });

  const format = result.format || path.extname(filePath).slice(1) || undefined;
  const resourceType = result.resource_type || 'image';
  const url = deliveryType === 'authenticated'
    ? cloudinaryConfig.cloudinary.url(result.public_id, {
      secure: true,
      sign_url: true,
      type: deliveryType,
      resource_type: resourceType,
      ...(format ? { format } : {}),
    })
    : result.secure_url;

  return {
    url,
    secureUrl: result.secure_url,
    publicId: result.public_id,
    assetId: result.asset_id,
    format,
    size: result.bytes,
    width: result.width,
    height: result.height,
    resourceType,
    deliveryType,
  };
};

const deleteFromCloudinary = async (publicId, options = {}) => {
  if (!publicId || !cloudinaryConfig.isConfigured()) return false;
  cloudinaryConfig.assertReady();
  try {
    const result = await cloudinaryConfig.cloudinary.uploader.destroy(publicId, {
      resource_type: options.resourceType || 'image',
      type: options.deliveryType || 'upload',
      invalidate: true,
    });
    return result.result === 'ok' || result.result === 'not found';
  } catch (error) {
    logger.error('Cloudinary delete failed', { publicId, error: error.message });
    return false;
  }
};

const deleteLocalFile = (filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) return false;
    fs.unlinkSync(filePath);
    return true;
  } catch (error) {
    logger.error('Local file delete failed', { error: error.message });
    return false;
  }
};

cloudinaryConfig.configure();

module.exports = {
  upload,
  uploadToCloudinary,
  deleteFromCloudinary,
  deleteLocalFile,
  cloudinary: cloudinaryConfig.cloudinary,
  isCloudinaryConfigured: cloudinaryConfig.isConfigured,
  isCloudinaryRequired: cloudinaryConfig.isRequired,
};
