const kycService = require('./kyc.service');
const uploadService = require('../../services/upload.service');
const mediaService = require('../../services/media.service');
const { cloudinary } = require('../../config/upload');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

const setDocumentCorsHeaders = (req, res) => {
  const origin = req.get('origin');
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

const getDocumentResourceType = (document) => {
  if (document.resourceType) return document.resourceType;
  const url = String(document.url || '');
  const fileName = String(document.fileName || url).toLowerCase();
  if (url.includes('/image/upload/')) return 'image';
  if (url.includes('/raw/upload/') || fileName.endsWith('.pdf')) return 'raw';
  if (url.includes('/video/upload/')) return 'video';
  return 'image';
};

const getCloudinaryPublicIdFromUrl = (url) => {
  if (!cloudinary || !url) return null;
  try {
    const parsed = new URL(String(url));
    const uploadMarker = '/upload/';
    const uploadIndex = parsed.pathname.indexOf(uploadMarker);
    if (uploadIndex === -1) return null;

    const afterUpload = parsed.pathname.slice(uploadIndex + uploadMarker.length);
    const withoutVersion = afterUpload.replace(/^v\d+\//, '');
    const decoded = decodeURIComponent(withoutVersion);
    if (!decoded) return null;

    if (parsed.pathname.includes('/image/upload/')) {
      return decoded.replace(/\.[a-z0-9]+$/i, '');
    }

    return decoded;
  } catch {
    return null;
  }
};

const getSignedCloudinaryUrl = (document) => {
  const publicId = document.publicId || getCloudinaryPublicIdFromUrl(document.url);
  if (!publicId) return null;
  const resourceType = getDocumentResourceType(document);
  return mediaService.generateSignedUrl({
    publicId,
    resourceType,
    deliveryType: document.deliveryType || 'authenticated',
    format: document.format,
    fileName: document.fileName,
  }, 300);
};

const proxyRemoteDocument = async (document, req, res) => {
  const signedUrl = getSignedCloudinaryUrl(document);
  const allowStoredUrl = document.deliveryType !== 'authenticated';
  const urls = [signedUrl, allowStoredUrl ? document.url : null].filter(Boolean);
  let lastStatus = 0;

  for (const url of urls) {
    const response = await fetch(url);
    lastStatus = response.status;
    if (!response.ok) continue;

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const dispositionName = document.fileName || 'kyc-document';
    setDocumentCorsHeaders(req, res);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${dispositionName}"`);
    const buffer = Buffer.from(await response.arrayBuffer());
    return res.status(200).send(buffer);
  }

  return res.status(lastStatus || 404).json({
    success: false,
    message: 'Document file is not accessible. Please re-upload the document.',
  });
};

const streamResolvedDocument = async (document, req, res, disposition = 'inline') => {
  const documentUrl = String(document.url || '');
  if (documentUrl.startsWith('http') && !documentUrl.includes('/kyc/documents/')) {
    return proxyRemoteDocument(document, req, res);
  }

  const fileName = document.fileName || documentUrl.split('/').filter(Boolean).pop();
  const relativePath = documentUrl.includes('/kyc/documents/')
    ? fileName
    : document.url || fileName;
  let fileInfo;
  try {
    fileInfo = uploadService.getLocalFile(relativePath);
  } catch (error) {
    if (!fileName) throw error;
    const resolved = await kycService.getDocument(fileName, req.user || req.admin);
    if (resolved.cloudinaryUrl) {
      return proxyRemoteDocument({ ...document, url: resolved.cloudinaryUrl }, req, res);
    }
    fileInfo = uploadService.getLocalFile(resolved.filePath);
  }
  setDocumentCorsHeaders(req, res);
  res.setHeader('Content-Type', fileInfo.mimeType);
  res.setHeader('Content-Disposition', `${disposition}; filename="${fileName || 'kyc-document'}"`);
  return fileInfo.stream.pipe(res);
};

const uploadDocument = async (req, res, next) => {
  try {
    const { documentType } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Check if Cloudinary is configured
    if (mediaService.isReady()) {
      try {
        // Use Media Service for Cloudinary upload
        const uploadData = await mediaService.uploadFile(
          req.file,
          'kyc',
          req.user.id,
          {
            resource_type: 'auto' // Allow PDFs and images
          }
        );

        res.status(201).json({
          success: true,
          message: 'Document uploaded successfully',
          data: {
            url: uploadData.url,
            publicId: uploadData.publicId,
            assetId: uploadData.assetId,
            fileName: req.file.originalname,
            documentType,
            fileSize: uploadData.size,
            resourceType: uploadData.resourceType,
            deliveryType: uploadData.deliveryType,
            format: uploadData.format,
            uploadedAt: new Date(),
          },
        });
      } catch (cloudinaryError) {
        if (mediaService.isRequired()) throw cloudinaryError;
        // Cloudinary failed, fall back to local storage
        logger.warn('Cloudinary upload failed, falling back to local storage', {
          error: cloudinaryError.message,
          userId: req.user.id
        });
        
        const fileData = await uploadService.processUpload(
          req.file,
          req.user.id,
          `kyc-documents/${req.user.id}/${documentType}`,
          false // Don't try Cloudinary again
        );

        // Convert local file path to accessible URL
        const baseUrl = process.env.BASE_URL || process.env.BACKEND_URL || 'https://api.buizz.com';
        const relativePath = fileData.filePath.replace('/home/u943298757/domains/api.buizz.com/nodejs/storage', '/storage');
        const accessibleUrl = `${baseUrl}${relativePath}`;

        res.status(201).json({
          success: true,
          message: 'Document uploaded successfully (local storage)',
          data: {
            url: accessibleUrl,
            fileName: fileData.fileName,
            documentType,
            fileSize: fileData.fileSize,
            uploadedAt: fileData.uploadedAt,
          },
        });
      }
    } else {
      if (mediaService.isRequired()) {
        throw new AppError('Secure document storage is temporarily unavailable', 503);
      }
      // Fallback to local storage
      const fileData = await uploadService.processUpload(
        req.file,
        req.user.id,
        `kyc-documents/${req.user.id}/${documentType}`,
        false // Don't try Cloudinary
      );

      // Convert local file path to accessible URL
      const baseUrl = process.env.BASE_URL || process.env.BACKEND_URL || 'https://api.buizz.com';
      const relativePath = fileData.filePath.replace('/home/u943298757/domains/api.buizz.com/nodejs/storage', '/storage');
      const accessibleUrl = `${baseUrl}${relativePath}`;

      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully (local storage)',
        data: {
          url: accessibleUrl,
          fileName: fileData.fileName,
          documentType,
          fileSize: fileData.fileSize,
          uploadedAt: fileData.uploadedAt,
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

const uploadMultipleDocuments = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const documentTypes = Array.isArray(req.body.documentTypes)
      ? req.body.documentTypes
      : JSON.parse(req.body.documentTypes || '[]');

    if (documentTypes.length !== req.files.length) {
      return res.status(400).json({
        success: false,
        message: 'Number of document types must match number of files',
      });
    }

    let uploadedFiles;

    // Check if Cloudinary is configured
    if (mediaService.isReady()) {
      // Use Media Service for Cloudinary upload
      uploadedFiles = await mediaService.uploadMultipleFiles(
        req.files,
        'kyc',
        req.user.id,
        {
          resource_type: 'auto' // Allow PDFs and images
        }
      );

      res.status(201).json({
        success: true,
        message: `${uploadedFiles.length} documents uploaded successfully`,
        data: uploadedFiles.map((file, index) => ({
          url: file.url,
          publicId: file.publicId,
          assetId: file.assetId,
          fileName: req.files[index].originalname,
          documentType: documentTypes[index],
          fileSize: file.size,
          resourceType: file.resourceType,
          deliveryType: file.deliveryType,
          format: file.format,
          uploadedAt: new Date(),
        })),
      });
    } else {
      // Fallback to local storage
      uploadedFiles = await uploadService.processMultipleUploads(
        req.files,
        req.user.id,
        documentTypes,
        true
      );

      res.status(201).json({
        success: true,
        message: `${uploadedFiles.length} documents uploaded successfully`,
        data: uploadedFiles.map((file) => ({
          url: file.url,
          fileName: file.fileName,
          documentType: file.documentType,
          fileSize: file.fileSize,
          uploadedAt: file.uploadedAt,
        })),
      });
    }
  } catch (error) {
    next(error);
  }
};

const getDocument = async (req, res, next) => {
  try {
    const { filename } = req.params;
    const document = await kycService.getDocument(filename, req.user || req.admin);

    if (document.cloudinaryUrl) {
      return proxyRemoteDocument({
        ...document,
        url: document.cloudinaryUrl,
        deliveryType: document.deliveryType || 'authenticated',
      }, req, res);
    }

    const fileInfo = uploadService.getLocalFile(document.filePath);
    setDocumentCorsHeaders(req, res);
    res.setHeader('Content-Type', fileInfo.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    fileInfo.stream.pipe(res);
  } catch (error) {
    // Log detailed error for debugging
    logger.error('Document fetch failed', { 
      filename: req.params.filename, 
      error: error.message,
      userId: req.user?.id || req.admin?.id 
    });
    
    // Return 404 with CORS headers for better client handling
    setDocumentCorsHeaders(req, res);
    
    if (error.message.includes('not found') || error.statusCode === 404) {
      return res.status(404).json({ 
        success: false, 
        message: 'Document file not found on server. Please re-upload the document.' 
      });
    }
    next(error);
  }
};

const viewDocument = async (req, res, next) => {
  try {
    const { requestId, documentId } = req.params;
    const document = await kycService.viewDocument(requestId, documentId, req.user || req.admin);
    res.status(200).json({ success: true, data: document });
  } catch (error) {
    next(error);
  }
};

const downloadDocument = async (req, res, next) => {
  try {
    const { requestId, documentId } = req.params;
    const document = await kycService.viewDocument(requestId, documentId, req.user || req.admin);
    return streamResolvedDocument(document, req, res, 'attachment');
  } catch (error) {
    // Log detailed error for debugging
    logger.error('Document download failed', { 
      requestId: req.params.requestId, 
      documentId: req.params.documentId,
      error: error.message,
      userId: req.user?.id || req.admin?.id 
    });
    
    // Return 404 with CORS headers for better client handling
    setDocumentCorsHeaders(req, res);
    
    if (error.message.includes('not found') || error.statusCode === 404) {
      return res.status(404).json({ 
        success: false, 
        message: 'Document file not found on server. Please re-upload the document.' 
      });
    }
    next(error);
  }
};

const submitMyKyc = async (req, res, next) => {
  try {
    logger.info('KYC submission attempt', { userId: req.user?.id, role: req.user?.role, body: req.body });
    const data = await kycService.submitMyKyc(req.user, req.body);
    res.status(201).json({ success: true, message: 'KYC submitted for verification', data });
  } catch (error) {
    logger.error('KYC submission failed', { error: error.message, userId: req.user?.id });
    next(error);
  }
};

const getMyKyc = async (req, res, next) => {
  try {
    // Ensure this endpoint is only accessed by the actual organizer
    // Super-admins should use /kyc/requests/:id to view specific organizer data
    if (req.user.role !== 'organizer') {
      logger.warn('getMyKyc accessed by non-organizer', { role: req.user.role, userId: req.user.id });
      return next(new AppError('This endpoint is only accessible by organizers', 403));
    }
    
    const data = await kycService.getMyKyc(req.user);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const listRequests = async (req, res, next) => {
  try {
    const data = await kycService.listRequests(req.query, req.user);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getRequestById = async (req, res, next) => {
  try {
    const data = await kycService.getRequestById(req.params.id, req.user);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const reviewRequest = async (req, res, next) => {
  try {
    const data = await kycService.reviewRequest(req.params.id, req.body, req.user);
    res.status(200).json({ success: true, message: 'KYC review updated', data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadDocument,
  uploadMultipleDocuments,
  getDocument,
  viewDocument,
  downloadDocument,
  submitMyKyc,
  getMyKyc,
  listRequests,
  getRequestById,
  reviewRequest,
};
