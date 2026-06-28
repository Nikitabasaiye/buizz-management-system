const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticate } = require('../../middleware/rbac');
const kycController = require('./kyc.controller');
const { upload } = require('../../config/upload');

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  return next();
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

router.use(authenticate);

// Upload endpoints
router.post(
  '/upload',
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
  upload.array('documents', 10),
  kycController.uploadMultipleDocuments
);

// View document endpoints
router.get(
  '/documents/:filename',
  kycController.getDocument
);

router.get(
  '/requests/:requestId/documents/:documentId',
  [
    param('requestId').isInt({ min: 1 }).withMessage('Invalid request ID'),
    param('documentId').isInt({ min: 0 }).withMessage('Invalid document ID'),
    validate,
  ],
  kycController.viewDocument
);

router.get('/me', kycController.getMyKyc);
router.post('/me', submitValidators, kycController.submitMyKyc);

router.get(
  '/requests',
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

router.get(
  '/requests/:id',
  [param('id').isInt({ min: 1 }), validate],
  kycController.getRequestById
);

router.patch(
  '/requests/:id/review',
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
