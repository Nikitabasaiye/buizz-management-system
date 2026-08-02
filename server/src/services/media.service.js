const path = require('path');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const cloudinaryConfig = require('../config/cloudinary');
const { uploadToCloudinary, deleteFromCloudinary, deleteLocalFile } = require('../config/upload');

const PUBLIC_CATEGORIES = new Set(['users', 'organizers', 'events']);
const PRIVATE_CATEGORIES = new Set(['kyc', 'documents', 'tickets', 'support']);
const VALID_CATEGORIES = new Set([...PUBLIC_CATEGORIES, ...PRIVATE_CATEGORIES]);

const safeSegment = (value) => String(value || '')
  .trim()
  .replace(/[^a-zA-Z0-9_-]+/g, '-');

class MediaService {
  isReady() {
    return cloudinaryConfig.isConfigured();
  }

  isRequired() {
    return cloudinaryConfig.isRequired();
  }

  async verifyConnection() {
    return cloudinaryConfig.verifyConnection();
  }

  buildFolderPath(category, subFolder = '') {
    if (!VALID_CATEGORIES.has(category)) {
      throw new AppError(`Invalid media category: ${category}`, 400);
    }
    const suffix = String(subFolder || '')
      .split('/')
      .map(safeSegment)
      .filter(Boolean)
      .join('/');
    return suffix ? `${category}/${suffix}` : category;
  }

  async uploadFile(file, category, subFolder = '', options = {}) {
    if (!file?.path) throw new AppError('No file provided', 400);
    if (!this.isReady()) throw new AppError('Cloudinary is not configured', 503);

    const privateAsset = options.private ?? PRIVATE_CATEGORIES.has(category);
    const context = {
      category,
      owner: safeSegment(subFolder),
      ...(options.context || {}),
    };

    try {
      const result = await uploadToCloudinary(
        file.path,
        this.buildFolderPath(category, subFolder),
        {
          private: privateAsset,
          resourceType: options.resourceType || options.resource_type || 'auto',
          context,
        },
      );
      if (!result) throw new Error('Cloudinary upload returned no result');
      deleteLocalFile(file.path);
      logger.info('Media uploaded to Cloudinary', {
        category,
        publicId: result.publicId,
        resourceType: result.resourceType,
        deliveryType: result.deliveryType,
        size: result.size,
      });
      return result;
    } catch (error) {
      logger.error('Cloudinary media upload failed', { category, error: error.message });
      throw new AppError(`Media upload failed: ${error.message}`, 502);
    }
  }

  async uploadMultipleFiles(files, category, subFolder = '', options = {}) {
    if (!Array.isArray(files) || files.length === 0) {
      throw new AppError('No files provided', 400);
    }

    const uploaded = [];
    try {
      for (const file of files) {
        uploaded.push(await this.uploadFile(file, category, subFolder, options));
      }
      return uploaded;
    } catch (error) {
      await Promise.allSettled(uploaded.map((item) => this.deleteFile(item)));
      throw error;
    }
  }

  async deleteFile(asset) {
    const details = typeof asset === 'string' ? { publicId: asset } : asset;
    return deleteFromCloudinary(details?.publicId, {
      resourceType: details?.resourceType,
      deliveryType: details?.deliveryType,
    });
  }

  async deleteMultipleFiles(assets) {
    const results = await Promise.allSettled((assets || []).map((asset) => this.deleteFile(asset)));
    return {
      deleted: results.filter((result) => result.status === 'fulfilled' && result.value).length,
      failed: results.filter((result) => result.status === 'rejected' || !result.value).length,
    };
  }

  generateOptimizedUrl(publicId, transformations = {}) {
    if (!this.isReady()) return null;
    return cloudinaryConfig.cloudinary.url(publicId, {
      secure: true,
      quality: 'auto',
      fetch_format: 'auto',
      ...transformations,
    });
  }

  generateSignedUrl(asset, expiresIn = 300) {
    if (!this.isReady()) return null;
    const details = typeof asset === 'string' ? { publicId: asset } : asset;
    const format = details.format || path.extname(details.fileName || '').slice(1) || undefined;
    return cloudinaryConfig.cloudinary.utils.private_download_url(
      details.publicId,
      format,
      {
        resource_type: details.resourceType || 'image',
        type: details.deliveryType || 'authenticated',
        expires_at: Math.floor(Date.now() / 1000) + expiresIn,
        attachment: false,
      },
    );
  }

  async getFileInfo(publicId, options = {}) {
    if (!this.isReady()) throw new AppError('Cloudinary is not configured', 503);
    try {
      const result = await cloudinaryConfig.cloudinary.api.resource(publicId, {
        resource_type: options.resourceType || 'image',
        type: options.deliveryType || 'upload',
      });
      return {
        publicId: result.public_id,
        assetId: result.asset_id,
        url: result.secure_url,
        format: result.format,
        size: result.bytes,
        width: result.width,
        height: result.height,
        resourceType: result.resource_type,
        deliveryType: result.type,
        createdAt: result.created_at,
      };
    } catch (error) {
      logger.error('Cloudinary asset lookup failed', { publicId, error: error.message });
      throw new AppError('Media file not found', 404);
    }
  }
}

module.exports = new MediaService();
