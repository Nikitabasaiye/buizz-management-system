const path = require('path');
const fs = require('fs');
const { uploadToCloudinary, deleteFromCloudinary, deleteLocalFile } = require('../config/upload');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

class UploadService {
  /**
   * Process uploaded file and return file details
   */
  async processUpload(file, userId, documentType, useCloudinary = true) {
    if (!file) {
      throw new AppError('No file uploaded', 400);
    }

    const fileData = {
      originalName: file.originalname,
      fileName: file.filename,
      filePath: file.path,
      fileSize: file.size,
      mimeType: file.mimetype,
      documentType: documentType,
      uploadedAt: new Date(),
      uploadedBy: userId
    };

    // Upload to cloudinary if configured
    if (useCloudinary && process.env.CLOUDINARY_CLOUD_NAME) {
      try {
        const cloudinaryResult = await uploadToCloudinary(
          file.path,
          `kyc-documents/${userId}/${documentType}`
        );

        if (cloudinaryResult) {
          fileData.cloudinaryUrl = cloudinaryResult.url;
          fileData.cloudinaryPublicId = cloudinaryResult.publicId;
          
          // Delete local file after successful cloudinary upload
          deleteLocalFile(file.path);
          
          logger.info('File uploaded to Cloudinary', {
            userId,
            documentType,
            publicId: cloudinaryResult.publicId
          });
        }
      } catch (error) {
        logger.error('Cloudinary upload failed, using local storage', {
          userId,
          documentType,
          error: error.message
        });
      }
    }

    // Generate local URL
    const baseUrl = process.env.BASE_URL || 'http://localhost:4000';
    fileData.localUrl = `${baseUrl}/storage/kyc-documents/${path.basename(path.dirname(file.path))}/${file.filename}`;
    
    // Use cloudinary URL if available, otherwise local URL
    fileData.url = fileData.cloudinaryUrl || fileData.localUrl;

    return fileData;
  }

  /**
   * Process multiple file uploads
   */
  async processMultipleUploads(files, userId, documentTypes, useCloudinary = true) {
    const results = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const documentType = Array.isArray(documentTypes) ? documentTypes[i] : documentTypes;
      
      try {
        const fileData = await this.processUpload(file, userId, documentType, useCloudinary);
        results.push(fileData);
      } catch (error) {
        logger.error('File upload failed', { userId, documentType, error: error.message });
        // Clean up already uploaded files on error
        for (const result of results) {
          await this.deleteFile(result);
        }
        throw error;
      }
    }

    return results;
  }

  /**
   * Delete uploaded file (both local and cloudinary)
   */
  async deleteFile(fileData) {
    let deleted = false;

    // Delete from cloudinary if exists
    if (fileData.cloudinaryPublicId) {
      deleted = await deleteFromCloudinary(fileData.cloudinaryPublicId);
      logger.info('File deleted from Cloudinary', { publicId: fileData.cloudinaryPublicId });
    }

    // Delete local file if exists
    if (fileData.filePath && fs.existsSync(fileData.filePath)) {
      deleted = deleteLocalFile(fileData.filePath) || deleted;
      logger.info('Local file deleted', { filePath: fileData.filePath });
    }

    return deleted;
  }

  /**
   * Get file from local storage
   */
  getLocalFile(filePath) {
    // Handle both absolute and relative paths
    let fullPath;
    if (path.isAbsolute(filePath)) {
      fullPath = filePath;
    } else {
      fullPath = path.join(__dirname, '../../storage/kyc-documents', filePath);
    }
    
    if (!fs.existsSync(fullPath)) {
      throw new AppError('File not found', 404);
    }

    return {
      path: fullPath,
      stream: fs.createReadStream(fullPath),
      mimeType: this.getMimeType(fullPath)
    };
  }

  /**
   * Get MIME type from file extension
   */
  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Validate file size
   */
  validateFileSize(fileSize, maxSizeMB = 5) {
    const maxSize = maxSizeMB * 1024 * 1024; // Convert MB to bytes
    if (fileSize > maxSize) {
      throw new AppError(`File size exceeds ${maxSizeMB}MB limit`, 400);
    }
    return true;
  }

  /**
   * Validate file type
   */
  validateFileType(mimeType, allowedTypes = null) {
    const defaultAllowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/pdf',
      'image/webp'
    ];

    const allowed = allowedTypes || defaultAllowedTypes;
    
    if (!allowed.includes(mimeType)) {
      throw new AppError('Invalid file type', 400);
    }
    
    return true;
  }

  /**
   * Get file info without streaming
   */
  getFileInfo(filePath) {
    const fullPath = path.join(__dirname, '../../storage/kyc-documents', filePath);
    
    if (!fs.existsSync(fullPath)) {
      throw new AppError('File not found', 404);
    }

    const stats = fs.statSync(fullPath);
    
    return {
      path: fullPath,
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      mimeType: this.getMimeType(fullPath)
    };
  }

  /**
   * Create thumbnail for image (optional - requires sharp)
   */
  async createThumbnail(filePath, width = 200, height = 200) {
    // This requires 'sharp' package
    // npm install sharp
    try {
      const sharp = require('sharp');
      const ext = path.extname(filePath);
      const thumbnailPath = filePath.replace(ext, `_thumb${ext}`);
      
      await sharp(filePath)
        .resize(width, height, { fit: 'cover' })
        .toFile(thumbnailPath);
      
      return thumbnailPath;
    } catch (error) {
      logger.error('Thumbnail creation failed', { error: error.message });
      return null;
    }
  }
}

module.exports = new UploadService();
