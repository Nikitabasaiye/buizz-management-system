const kycRepository = require('./kyc.repository');
const settlementRepository = require('../settlements/settlement.repository');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');
const path = require('path');
const fs = require('fs');

const KYC_ROLES = ['organizer', 'admin', 'super_admin'];
const REQUIRED_DOCUMENT_TYPES = ['pan', 'address_proof'];
const REQUIRED_BANK_DOCUMENT_TYPES = ['cancelled_cheque_or_passbook'];

const normalizeDocument = (doc) => ({
  type: String(doc.type || '').trim(),
  url: String(doc.url || '').trim(),
  fileName: doc.fileName ? String(doc.fileName).trim() : null,
  documentNumber: doc.documentNumber ? String(doc.documentNumber).trim() : null,
});

const hasDocumentType = (documents, type) => documents.some((doc) => doc.type === type && doc.url);

class KycService {
  async submitMyKyc(user, data) {
    if (!KYC_ROLES.includes(user.role)) {
      throw new AppError('KYC is only available for organizer, admin, and super admin accounts', 403);
    }

    const dbUser = await kycRepository.findUserById(user.id);
    if (!dbUser) throw new AppError('User not found', 404);

    const documents = (data.documents || []).map(normalizeDocument);
    const bankDocuments = (data.bankDocuments || []).map(normalizeDocument);

    for (const type of REQUIRED_DOCUMENT_TYPES) {
      if (!hasDocumentType(documents, type)) {
        throw new AppError(`Missing required KYC document: ${type}`, 400);
      }
    }

    for (const type of REQUIRED_BANK_DOCUMENT_TYPES) {
      if (!hasDocumentType(bankDocuments, type)) {
        throw new AppError(`Missing required bank document: ${type}`, 400);
      }
    }

    const bankAccount = await settlementRepository.findBankAccountByOrganizer(user.id);
    if (!bankAccount) {
      throw new AppError('Please save bank account details before submitting KYC', 400);
    }

    const request = await kycRepository.createRequest({
      userId: user.id,
      role: user.role,
      legalName: data.legalName,
      businessName: data.businessName,
      panNumber: String(data.panNumber).toUpperCase(),
      gstNumber: data.gstNumber ? String(data.gstNumber).toUpperCase() : null,
      aadhaarLast4: data.aadhaarLast4 || null,
      addressLine: data.addressLine,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      bankAccountId: bankAccount.id,
      documents,
      bankDocuments,
    });

    logger.info('KYC submitted', { userId: user.id, requestId: request.id, role: user.role });
    return request;
  }

  async getMyKyc(user) {
    const latest = await kycRepository.findLatestByUserId(user.id);
    const dbUser = await kycRepository.findUserById(user.id);

    return {
      user: dbUser,
      latestRequest: latest,
    };
  }

  async listRequests(filters, requester) {
    if (requester.role !== 'super_admin') {
      throw new AppError('Only super admin can view KYC verification queue', 403);
    }
    return kycRepository.listRequests(filters);
  }

  async getRequestById(id, requester) {
    const request = await kycRepository.findById(id);
    if (!request) throw new AppError('KYC request not found', 404);

    if (requester.role !== 'super_admin' && String(request.user_id) !== String(requester.id)) {
      throw new AppError('Access denied', 403);
    }

    return request;
  }

  async viewDocument(requestId, documentId, requester) {
    const request = await kycRepository.findById(requestId);
    if (!request) throw new AppError('KYC request not found', 404);

    // Check access permission
    if (requester.role !== 'super_admin' && String(request.user_id) !== String(requester.id)) {
      throw new AppError('Access denied', 403);
    }

    // Find document in documents or bank_documents array
    const allDocuments = [...request.documents, ...request.bank_documents];
    const document = allDocuments.find((doc, index) => index === parseInt(documentId));

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    return {
      requestId: request.id,
      userId: request.user_id,
      userName: request.user_name,
      documentType: document.type,
      url: document.url,
      fileName: document.fileName,
      documentNumber: document.documentNumber,
      uploadedAt: request.submitted_at
    };
  }

  async getDocument(filename, requester) {
    // Extract user ID from filename (format: userId_docType_timestamp.ext)
    const parts = filename.split('_');
    const fileUserId = parts[0];

    // Check if user can access this document
    if (requester.role !== 'super_admin' && String(fileUserId) !== String(requester.id)) {
      throw new AppError('Access denied', 403);
    }

    // Find document in database
    const request = await kycRepository.findLatestByUserId(fileUserId);
    if (!request) {
      throw new AppError('KYC request not found', 404);
    }

    // Check if filename exists in documents
    const allDocuments = [...request.documents, ...request.bank_documents];
    const document = allDocuments.find(doc => doc.fileName === filename || doc.url.includes(filename));

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    // Determine file path
    if (document.url.startsWith('http')) {
      // External URL (cloudinary)
      return {
        cloudinaryUrl: document.url,
        fileName: filename
      };
    } else {
      // Local file - extract relative path from URL
      const basePath = path.join(__dirname, '../../../storage/kyc-documents');
      
      // Extract the relative path from the URL
      // URL format: http://localhost:4000/storage/kyc-documents/pan/123_pan_xxx.pdf
      let relativePath = filename;
      if (document.url.includes('/storage/kyc-documents/')) {
        relativePath = document.url.split('/storage/kyc-documents/')[1];
      }
      
      const fullPath = path.join(basePath, relativePath);
      
      if (!fs.existsSync(fullPath)) {
        // Try with just filename in different folders
        const possibleFolders = ['pan', 'address-proof', 'aadhaar', 'bank-documents', ''];
        let foundPath = null;
        
        for (const folder of possibleFolders) {
          const testPath = path.join(basePath, folder, filename);
          if (fs.existsSync(testPath)) {
            foundPath = path.join(folder, filename);
            break;
          }
        }
        
        if (!foundPath) {
          throw new AppError('Document file not found on server', 404);
        }
        
        return {
          filePath: foundPath,
          fileName: filename,
          mimeType: document.mimeType || 'application/octet-stream'
        };
      }

      return {
        filePath: relativePath,
        fileName: filename,
        mimeType: document.mimeType || 'application/octet-stream'
      };
    }
  }

  async reviewRequest(id, data, requester) {
    if (requester.role !== 'super_admin') {
      throw new AppError('Only super admin can verify or reject KYC documents', 403);
    }

    const status = data.status;
    const bankStatus = data.bankStatus || status;

    if (status === 'rejected' && !data.rejectionReason) {
      throw new AppError('Rejection reason is required when rejecting KYC', 400);
    }

    const reviewed = await kycRepository.reviewRequest(id, {
      status,
      bankStatus,
      reviewedBy: requester.id,
      rejectionReason: data.rejectionReason,
      reviewNotes: data.reviewNotes,
    });

    if (!reviewed) throw new AppError('KYC request not found', 404);

    logger.info('KYC reviewed', {
      requestId: id,
      userId: reviewed.user_id,
      status,
      bankStatus,
      reviewedBy: requester.id,
    });

    return reviewed;
  }
}

module.exports = new KycService();
