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
  publicId: doc.publicId ? String(doc.publicId).trim() : null,
  resourceType: doc.resourceType ? String(doc.resourceType).trim() : null,
  documentNumber: doc.documentNumber ? String(doc.documentNumber).trim() : null,
});

const hasDocumentType = (documents, type) =>
  documents.some((doc) => doc.type === type && doc.url);

class KycService {
  async submitMyKyc(user, data) {
    logger.info('KYC service submission', { userId: user?.id, role: user?.role, hasData: !!data });

    if (!user || !user.id) {
      throw new AppError('User not authenticated', 401);
    }

    if (!KYC_ROLES.includes(user.role)) {
      logger.warn('KYC submission failed: Invalid role', { userId: user.id, role: user.role });
      throw new AppError('KYC is only available for organizer, admin, and super admin accounts', 403);
    }

    const dbUser = await kycRepository.findUserById(user.id);
    if (!dbUser) throw new AppError('User not found', 404);

    const latestRequest = await kycRepository.findLatestByUserId(user.id);
    if (
      latestRequest &&
      ['pending', 'verified', 'approved'].includes(String(latestRequest.status).toLowerCase()) &&
      data.replaceExisting !== true
    ) {
      logger.info('Returning existing KYC request instead of creating a duplicate', {
        userId: user.id,
        requestId: latestRequest.id,
        status: latestRequest.status,
      });
      return latestRequest;
    }

    const documents = (data.documents || []).map(normalizeDocument);
    const bankDocuments = (data.bankDocuments || []).map(normalizeDocument);

    logger.info('Document validation', { 
      documentCount: documents.length, 
      bankDocumentCount: bankDocuments.length,
      documents: documents.map(d => d.type),
      bankDocuments: bankDocuments.map(d => d.type)
    });

    for (const type of REQUIRED_DOCUMENT_TYPES) {
      if (!hasDocumentType(documents, type)) {
        logger.warn('Missing required document', { type, documents: documents.map(d => d.type) });
        throw new AppError(`Missing required KYC document: ${type}`, 400);
      }
    }

    for (const type of REQUIRED_BANK_DOCUMENT_TYPES) {
      if (!hasDocumentType(bankDocuments, type)) {
        logger.warn('Missing required bank document', { type, bankDocuments: bankDocuments.map(d => d.type) });
        throw new AppError(`Missing required bank document: ${type}`, 400);
      }
    }

    const bankAccount = await settlementRepository.findBankAccountByOrganizer(user.id);
    const bankAccountId = bankAccount ? bankAccount.id : null;

    logger.info('Creating KYC request', { userId: user.id, bankAccountId });

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
      bankAccountId,
      documents,
      bankDocuments,
    });

    logger.info('KYC submitted successfully', { userId: user.id, requestId: request.id, role: user.role });
    return request;
  }

  async getMyKyc(user) {
    const latest = await kycRepository.findLatestByUserId(user.id);
    const dbUser = await kycRepository.findUserById(user.id);
    return { user: dbUser, latestRequest: latest };
  }

  async listRequests(filters, requester) {
    logger.info('KYC listRequests access attempt', { 
      requesterRole: requester.role, 
      requesterId: requester.id,
      requesterEmail: requester.email,
      filters,
      expectedRoles: ['admin', 'super_admin', 'organizer']
    });
    
    // Admin and super_admin can view all requests
    if (['admin', 'super_admin'].includes(requester.role)) {
      return kycRepository.listRequests(filters);
    }
    
    // Organizers can only view their own requests
    if (requester.role === 'organizer') {
      return kycRepository.listRequests({ ...filters, userId: requester.id });
    }
    
    logger.warn('KYC listRequests permission denied', { 
      requesterRole: requester.role, 
      requesterId: requester.id,
      requesterEmail: requester.email 
    });
    throw new AppError('You do not have permission to view KYC requests', 403);
  }

  async getRequestById(id, requester) {
    const request = await kycRepository.findById(id);
    if (!request) throw new AppError('KYC request not found', 404);

    // Admin and super_admin can view any request
    if (['admin', 'super_admin'].includes(requester.role)) {
      return request;
    }
    
    // Users can only view their own requests
    if (String(request.user_id) !== String(requester.id)) {
      throw new AppError('Access denied', 403);
    }

    return request;
  }

  async viewDocument(requestId, documentId, requester) {
    const request = await kycRepository.findById(requestId);
    if (!request) throw new AppError('KYC request not found', 404);

    // Admin and super_admin can view any document
    if (['admin', 'super_admin'].includes(requester.role)) {
      // Continue to document access
    } else if (String(request.user_id) !== String(requester.id)) {
      throw new AppError('Access denied', 403);
    }

    const allDocuments = [...request.documents, ...request.bank_documents];
    const document = allDocuments[parseInt(documentId)];

    if (!document) throw new AppError('Document not found', 404);

    return {
      requestId: request.id,
      userId: request.user_id,
      userName: request.user_name,
      documentType: document.type,
      url: document.url,
      fileName: document.fileName,
      publicId: document.publicId,
      resourceType: document.resourceType,
      documentNumber: document.documentNumber,
      uploadedAt: request.submitted_at,
    };
  }

  async getDocument(filename, requester) {
    // Filename format: userId_docType_timestamp.ext
    const parts = filename.split('_');
    const fileUserId = parts[0];

    // Admin and super_admin can view any document
    if (['admin', 'super_admin'].includes(requester.role)) {
      // Continue to document access
    } else if (String(fileUserId) !== String(requester.id)) {
      throw new AppError('Access denied', 403);
    }

    const request = await kycRepository.findLatestByUserId(fileUserId);
    if (!request) throw new AppError('KYC request not found', 404);

    const allDocuments = [...request.documents, ...request.bank_documents];
    const document = allDocuments.find(
      (doc) =>
        doc.fileName === filename ||
        (doc.url && (doc.url === filename || doc.url.endsWith(`/${filename}`) || doc.url.endsWith(filename)))
    );

    if (!document) throw new AppError('Document not found', 404);

    // External URL (Cloudinary or other CDN) — starts with http and has no local path pattern
    if (document.url && document.url.startsWith('http')) {
      return { cloudinaryUrl: document.url, fileName: filename };
    }

    // Local file — url is a relative path like "pan/userId_pan_123.jpg"
    const storageBase = path.join(__dirname, '../../../storage/kyc-documents');

    // Try the relative path stored in the DB first
    if (document.url) {
      const fromRelative = path.join(storageBase, document.url);
      if (fs.existsSync(fromRelative)) {
        return { filePath: document.url, fileName: filename };
      }
    }

    // Fallback: search sub-folders by filename
    const subFolders = ['pan', 'address-proof', 'aadhaar', 'bank-documents', ''];

    for (const folder of subFolders) {
      const candidate = folder
        ? path.join(storageBase, folder, filename)
        : path.join(storageBase, filename);

      if (fs.existsSync(candidate)) {
        const relativePath = folder ? `${folder}/${filename}` : filename;
        return { filePath: relativePath, fileName: filename };
      }
    }

    throw new AppError('Document file not found on server', 404);
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
