const cloudinary = require('cloudinary').v2;
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Unified Media Service for Cloudinary operations
 * Handles uploads, deletions, and URL generation for all media types
 */
class MediaService {
  constructor() {
    this.isConfigured = false;
    this.baseFolder = 'buizz';
    this.initializeCloudinary();
  }

  async initializeCloudinary() {
    this.isConfigured = await this.configureCloudinary();
  }

  async configureCloudinary() {
    if (!process.env.CLOUDINARY_CLOUD_NAME || 
        !process.env.CLOUDINARY_API_KEY || 
        !process.env.CLOUDINARY_API_SECRET) {
      logger.warn('Cloudinary not configured - using local storage fallback');
      return false;
    }

    // Check if credentials are placeholder values
    if (process.env.CLOUDINARY_CLOUD_NAME === 'your-cloud-name' ||
        process.env.CLOUDINARY_API_KEY === 'your-api-key' ||
        process.env.CLOUDINARY_API_SECRET === 'your-api-secret') {
      logger.warn('Cloudinary credentials are placeholder values - using local storage fallback');
      return false;
    }

    try {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
      });

      // Test the configuration by making a simple API call
      await cloudinary.api.ping();
      
      logger.info('Cloudinary configured successfully');
      return true;
    } catch (error) {
      logger.warn('Cloudinary configuration failed - using local storage fallback', { error: error.message });
      return false;
    }
  }

  /**
   * Upload file to Cloudinary with proper folder structure
   * @param {Object} file - Multer file object
   * @param {string} category - Category (users, organizers, events, kyc, documents, tickets)
   * @param {string} subFolder - Sub-folder (e.g., userId, eventId)
   * @param {Object} options - Additional Cloudinary options
   * @returns {Promise<Object>} Upload result with URL, publicId, etc.
   */
  async uploadFile(file, category, subFolder = '', options = {}) {
    if (!this.isConfigured) {
      throw new AppError('Cloudinary is not configured', 500);
    }

    if (!file) {
      throw new AppError('No file provided', 400);
    }

    try {
      const folder = this.buildFolderPath(category, subFolder);
      
      const uploadOptions = {
        folder: folder,
        resource_type: 'auto',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'mp4', 'mov', 'avi'],
        use_filename: true,
        unique_filename: true,
        ...options
      };

      // Add transformations based on category
      if (category === 'events' || category === 'organizers') {
        uploadOptions.transformation = [
          { quality: 'auto', fetch_format: 'auto' },
          { width: 1920, height: 1080, crop: 'limit' }
        ];
      }

      if (category === 'users') {
        uploadOptions.transformation = [
          { quality: 'auto', fetch_format: 'auto' },
          { width: 400, height: 400, crop: 'fill' }
        ];
      }

      const result = await cloudinary.uploader.upload(file.path, uploadOptions);

      logger.info('File uploaded to Cloudinary', {
        category,
        subFolder,
        publicId: result.public_id,
        format: result.format,
        size: result.bytes
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        size: result.bytes,
        width: result.width,
        height: result.height,
        resourceType: result.resource_type,
        folder: folder
      };
    } catch (error) {
      logger.error('Cloudinary upload failed', {
        category,
        subFolder,
        error: error.message
      });
      
      // Check if it's a Cloudinary account issue - throw to allow fallback
      if (error.message.includes('cloud_name is disabled') || 
          error.message.includes('Invalid cloud name') ||
          error.message.includes('Authentication required')) {
        throw new AppError('Cloudinary account is disabled or misconfigured', 500);
      }
      
      throw new AppError(`Upload failed: ${error.message}`, 500);
    }
  }

  /**
   * Upload multiple files
   * @param {Array} files - Array of Multer file objects
   * @param {string} category - Category
   * @param {string} subFolder - Sub-folder
   * @param {Object} options - Additional Cloudinary options
   * @returns {Promise<Array>} Array of upload results
   */
  async uploadMultipleFiles(files, category, subFolder = '', options = {}) {
    if (!Array.isArray(files) || files.length === 0) {
      throw new AppError('No files provided', 400);
    }

    const uploadPromises = files.map(file => 
      this.uploadFile(file, category, subFolder, options)
    );

    try {
      const results = await Promise.all(uploadPromises);
      return results;
    } catch (error) {
      // Clean up any successfully uploaded files
      for (const result of results) {
        if (result && result.publicId) {
          await this.deleteFile(result.publicId).catch(err => {
            logger.error('Failed to cleanup uploaded file', { publicId: result.publicId, error: err.message });
          });
        }
      }
      throw error;
    }
  }

  /**
   * Delete file from Cloudinary
   * @param {string} publicId - Cloudinary public ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(publicId) {
    if (!this.isConfigured) {
      logger.warn('Cloudinary not configured - skipping delete');
      return false;
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId);
      logger.info('File deleted from Cloudinary', { publicId, result: result.result });
      return result.result === 'ok';
    } catch (error) {
      logger.error('Cloudinary delete failed', { publicId, error: error.message });
      return false;
    }
  }

  /**
   * Delete multiple files
   * @param {Array} publicIds - Array of Cloudinary public IDs
   * @returns {Promise<Object>} Delete results
   */
  async deleteMultipleFiles(publicIds) {
    if (!Array.isArray(publicIds) || publicIds.length === 0) {
      return { deleted: 0, failed: 0 };
    }

    const results = await Promise.allSettled(
      publicIds.map(publicId => this.deleteFile(publicId))
    );

    const deleted = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failed = results.filter(r => r.status === 'rejected' || !r.value).length;

    return { deleted, failed };
  }

  /**
   * Generate optimized URL with transformations
   * @param {string} publicId - Cloudinary public ID
   * @param {Object} transformations - Cloudinary transformations
   * @returns {string} Optimized URL
   */
  generateOptimizedUrl(publicId, transformations = {}) {
    if (!this.isConfigured) {
      return null;
    }

    const defaultTransformations = {
      quality: 'auto',
      fetch_format: 'auto'
    };

    const finalTransformations = { ...defaultTransformations, ...transformations };
    return cloudinary.url(publicId, finalTransformations);
  }

  /**
   * Generate secure signed URL for private files
   * @param {string} publicId - Cloudinary public ID
   * @param {number} expiresIn - URL expiration time in seconds
   * @returns {string} Signed URL
   */
  generateSignedUrl(publicId, expiresIn = 3600) {
    if (!this.isConfigured) {
      return null;
    }

    return cloudinary.url(publicId, {
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + expiresIn
    });
  }

  /**
   * Build folder path based on category and sub-folder
   * @param {string} category - Category
   * @param {string} subFolder - Sub-folder
   * @returns {string} Full folder path
   */
  buildFolderPath(category, subFolder = '') {
    const validCategories = ['users', 'organizers', 'events', 'kyc', 'documents', 'tickets'];
    
    if (!validCategories.includes(category)) {
      throw new AppError(`Invalid category: ${category}`, 400);
    }

    let path = `${this.baseFolder}/${category}`;
    
    if (subFolder) {
      path += `/${subFolder}`;
    }

    return path;
  }

  /**
   * Get file info from Cloudinary
   * @param {string} publicId - Cloudinary public ID
   * @returns {Promise<Object>} File info
   */
  async getFileInfo(publicId) {
    if (!this.isConfigured) {
      throw new AppError('Cloudinary not configured', 500);
    }

    try {
      const result = await cloudinary.api.resource(publicId);
      return {
        publicId: result.public_id,
        url: result.secure_url,
        format: result.format,
        size: result.bytes,
        width: result.width,
        height: result.height,
        resourceType: result.resource_type,
        createdAt: result.created_at
      };
    } catch (error) {
      logger.error('Failed to get file info', { publicId, error: error.message });
      throw new AppError('File not found', 404);
    }
  }

  /**
   * Check if Cloudinary is configured
   * @returns {boolean} Configuration status
   */
  isReady() {
    return this.isConfigured;
  }
}

module.exports = new MediaService();
