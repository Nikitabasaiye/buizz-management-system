const path = require('path');
const fs = require('fs');
const {
  uploadToCloudinary,
  deleteFromCloudinary,
  deleteLocalFile,
  isCloudinaryRequired,
} = require('../config/upload');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

class UploadService {
  async processUpload(file, userId, documentType, useCloudinary = true) {
    if (!file) throw new AppError('No file uploaded', 400);

    const fileData = {
      originalName: file.originalname,
      fileName: file.filename,
      filePath: file.path,
      fileSize: file.size,
      mimeType: file.mimetype,
      documentType,
      uploadedAt: new Date(),
      uploadedBy: userId,
    };

    // Try Cloudinary upload if configured
    const cloudinaryConfigured =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_CLOUD_NAME !== 'your-cloud-name' &&
      useCloudinary;

    if (cloudinaryConfigured) {
      try {
        const cloudinaryResult = await uploadToCloudinary(
          file.path,
          `${documentType}/${userId}`,
          {
            private: !String(documentType).startsWith('events/'),
            context: { owner: String(userId), document_type: String(documentType) },
          },
        );

        if (cloudinaryResult) {
          fileData.cloudinaryUrl = cloudinaryResult.url;
          fileData.cloudinaryPublicId = cloudinaryResult.publicId;
          fileData.cloudinaryAssetId = cloudinaryResult.assetId;
          fileData.resourceType = cloudinaryResult.resourceType;
          fileData.deliveryType = cloudinaryResult.deliveryType;
          fileData.format = cloudinaryResult.format;
          deleteLocalFile(file.path);
          logger.info('File uploaded to Cloudinary', { userId, documentType, publicId: cloudinaryResult.publicId });
        }
      } catch (error) {
        if (isCloudinaryRequired()) throw error;
        logger.error('Cloudinary upload failed, using local storage', {
          userId,
          documentType,
          error: error.message,
        });
      }
    }

    // Store a relative path so the DB is not tied to any host/URL
    const parentFolder = path.basename(path.dirname(file.path));
    const folderSegment = parentFolder === 'kyc-documents' ? '' : `${parentFolder}/`;
    fileData.relativePath = `${folderSegment}${file.filename}`;

    // Use Cloudinary URL if available, otherwise the relative storage path
    fileData.url = fileData.cloudinaryUrl || fileData.relativePath;

    return fileData;
  }

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
        for (const result of results) {
          await this.deleteFile(result);
        }
        throw error;
      }
    }

    return results;
  }

  async deleteFile(fileData) {
    let deleted = false;

    if (fileData.cloudinaryPublicId) {
      deleted = await deleteFromCloudinary(fileData.cloudinaryPublicId, {
        resourceType: fileData.resourceType,
        deliveryType: fileData.deliveryType,
      });
    }

    if (fileData.filePath && fs.existsSync(fileData.filePath)) {
      deleted = deleteLocalFile(fileData.filePath) || deleted;
    }

    return deleted;
  }

  getLocalFile(filePath) {
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
      mimeType: this.getMimeType(fullPath),
    };
  }

  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
}

module.exports = new UploadService();
