const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../../middleware/rbac');
const { authenticateAdmin } = require('../admin/admin.middleware');
const { authenticateOrganizer } = require('../organizer/organizer.middleware');
const kycController = require('./kyc.controller');
const { upload } = require('../../config/upload');
const logger = require('../../utils/logger');

const router = express.Router();

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
  res.setHeader('Access-Control-Max-Age', '86400');
};

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  return next();
};

// Unified authentication for both user and admin tokens
const authenticateUserOrAdmin = async (req, res, next) => {
  try {
    // Prefer explicit bearer auth over cookies. Super-admin pages can coexist
    // with organizer sessions in the same browser, and the bearer token should
    // decide which role is making this request.
    const token = req.headers.authorization?.split(' ')[1] || req.cookies.admin_token || req.cookies.token;
    if (!token) return next(new (require('../../middleware/errorHandler').AppError)('Authentication required', 401));

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type === 'admin') {
      // Admin authentication
      const adminRepository = require('../admin/admin.repository');
      const admin = await adminRepository.findById(decoded.id);
      if (!admin) return next(new (require('../../middleware/errorHandler').AppError)('Admin not found', 401));
      if (!admin.is_active) return next(new (require('../../middleware/errorHandler').AppError)('Account is deactivated', 403));

      req.admin = {
        id: String(admin.id),
        name: admin.name,
        email: admin.email,
        role: 'admin',
        isSuperAdmin: !!admin.is_super_admin,
        permissions: admin.permissions || [],
      };
      // Set req.user for compatibility with authorize middleware
      req.user = {
        id: String(admin.id),
        name: admin.name,
        email: admin.email,
        role: admin.is_super_admin ? 'super_admin' : 'admin',
      };
      next();
    } else {
      // User authentication
      await authenticate(req, res, next);
    }
  } catch (error) {
    const AppError = require('../../middleware/errorHandler').AppError;
    if (error.name === 'JsonWebTokenError') return next(new AppError('Invalid token', 401));
    if (error.name === 'TokenExpiredError') return next(new AppError('Token has expired', 401));
    next(new AppError('Authentication failed', 401));
  }
};

const documentValidator = (field) => [
  body(field).isArray({ min: 1 }).withMessage(`${field} must include at least one document`),
  body(`${field}.*.type`).trim().notEmpty().withMessage('Document type is required'),
  body(`${field}.*.url`).trim().notEmpty().withMessage('Document URL is required'),
  body(`${field}.*.fileName`).optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body(`${field}.*.documentNumber`).optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
];

const submitValidators = [
  body('legalName').trim().notEmpty().isLength({ max: 150 }).withMessage('Legal name is required'),
  body('businessName').optional({ checkFalsy: true }).trim().isLength({ max: 180 }),
  body('panNumber').trim().matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/i).withMessage('Valid PAN number is required'),
  body('gstNumber').optional({ checkFalsy: true }).trim().matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i).withMessage('Valid GST number is required'),
  body('aadhaarLast4').optional({ checkFalsy: true }).trim().matches(/^[0-9]{4}$/).withMessage('Aadhaar last 4 digits must be numeric'),
  body('addressLine').trim().notEmpty().isLength({ max: 255 }).withMessage('Address is required'),
  body('city').trim().notEmpty().isLength({ max: 120 }).withMessage('City is required'),
  body('state').trim().notEmpty().isLength({ max: 120 }).withMessage('State is required'),
  body('pincode').trim().matches(/^[0-9A-Z -]{4,20}$/i).withMessage('Valid pincode is required'),
  ...documentValidator('documents'),
  ...documentValidator('bankDocuments'),
  validate,
];

// Upload endpoints - use organizer authentication for organizers
router.post(
  '/upload',
  authenticateOrganizer,
  upload.single('document'),
  [
    body('documentType')
      .trim()
      .notEmpty()
      .withMessage('Document type is required')
      .isIn(['pan', 'address_proof', 'aadhaar', 'driving_license', 'voter_id', 'passport', 'gst_certificate', 'cancelled_cheque_or_passbook', 'bank_statement'])
      .withMessage('Invalid document type'),
    validate,
  ],
  kycController.uploadDocument
);

router.post(
  '/upload-multiple',
  authenticateOrganizer,
  upload.array('documents', 10),
  kycController.uploadMultipleDocuments
);

// View document endpoints
router.options('/documents/:filename', (req, res) => {
  setDocumentCorsHeaders(req, res);
  return res.sendStatus(204);
});
router.use('/documents/:filename', (req, res, next) => {
  setDocumentCorsHeaders(req, res);
  return next();
});
router.get(
  '/documents/:filename',
  authenticateUserOrAdmin,
  kycController.getDocument
);

router.get(
  '/requests/:requestId/documents/:documentId',
  authenticateUserOrAdmin,
  [
    param('requestId').isInt({ min: 1 }).withMessage('Invalid request ID'),
    param('documentId').isInt({ min: 0 }).withMessage('Invalid document ID'),
    validate,
  ],
  kycController.viewDocument
);

router.get(
  '/requests/:requestId/documents/:documentId/download',
  authenticateUserOrAdmin,
  [
    param('requestId').isInt({ min: 1 }).withMessage('Invalid request ID'),
    param('documentId').isInt({ min: 0 }).withMessage('Invalid document ID'),
    validate,
  ],
  kycController.downloadDocument
);

// KYC endpoints for organizers
router.get('/me', authenticateOrganizer, kycController.getMyKyc);
router.post('/me', authenticateOrganizer, submitValidators, kycController.submitMyKyc);

router.get(
  '/requests',
  authenticateUserOrAdmin,
  [
    query('status').optional().isIn(['pending', 'verified', 'rejected']),
    query('role').optional().isIn(['organizer', 'admin', 'super_admin']),
    query('userId').optional().isInt({ min: 1 }),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    validate,
  ],
  kycController.listRequests
);

// Super admin specific endpoint to view all KYC requests (bypass organizer restrictions)
router.get(
  '/all-requests',
  authenticateUserOrAdmin,
  authorize('super_admin'),
  [
    query('status').optional().isIn(['pending', 'verified', 'rejected']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    validate,
  ],
  kycController.listRequests
);

router.get(
  '/requests/:id',
  authenticateUserOrAdmin,
  [param('id').isInt({ min: 1 }), validate],
  kycController.getRequestById
);

router.patch(
  '/requests/:id/review',
  authenticateUserOrAdmin,
  [
    param('id').isInt({ min: 1 }),
    body('status').isIn(['verified', 'rejected']),
    body('bankStatus').optional().isIn(['verified', 'rejected']),
    body('rejectionReason').optional({ checkFalsy: true }).trim().isLength({ max: 2000 }),
    body('reviewNotes').optional({ checkFalsy: true }).trim().isLength({ max: 2000 }),
    validate,
  ],
  kycController.reviewRequest
);

module.exports = router;
