const kycService = require('./kyc.service');
const uploadService = require('../../services/upload.service');
const path = require('path');
const fs = require('fs');

const uploadDocument = async (req, res, next) => {
  try {
    const { documentType } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const fileData = await uploadService.processUpload(
      req.file,
      req.user.id,
      documentType,
      true // use cloudinary if configured
    );

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        url: fileData.url,
        fileName: fileData.fileName,
        documentType: documentType,
        fileSize: fileData.fileSize,
        uploadedAt: fileData.uploadedAt
      }
    });
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
        message: 'Number of document types must match number of files' 
      });
    }

    const uploadedFiles = await uploadService.processMultipleUploads(
      req.files,
      req.user.id,
      documentTypes,
      true
    );

    res.status(201).json({
      success: true,
      message: `${uploadedFiles.length} documents uploaded successfully`,
      data: uploadedFiles.map(file => ({
        url: file.url,
        fileName: file.fileName,
        documentType: file.documentType,
        fileSize: file.fileSize,
        uploadedAt: file.uploadedAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

const getDocument = async (req, res, next) => {
  try {
    const { filename } = req.params;
    const document = await kycService.getDocument(filename, req.user);

    if (document.cloudinaryUrl) {
      // Redirect to cloudinary URL
      return res.redirect(document.cloudinaryUrl);
    }

    // Serve local file
    const fileInfo = uploadService.getLocalFile(document.filePath);
    res.setHeader('Content-Type', fileInfo.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    fileInfo.stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

const viewDocument = async (req, res, next) => {
  try {
    const { requestId, documentId } = req.params;
    const document = await kycService.viewDocument(requestId, documentId, req.user);

    res.status(200).json({
      success: true,
      data: document
    });
  } catch (error) {
    next(error);
  }
};

const submitMyKyc = async (req, res, next) => {
  try {
    const data = await kycService.submitMyKyc(req.user, req.body);
    res.status(201).json({ success: true, message: 'KYC submitted for verification', data });
  } catch (error) {
    next(error);
  }
};

const getMyKyc = async (req, res, next) => {
  try {
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
  submitMyKyc,
  getMyKyc,
  listRequests,
  getRequestById,
  reviewRequest,
};
