const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../../middleware/rbac');
const { upload } = require('../../config/upload');
const settlementController = require('./settlement.controller');

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  return next();
};

const bankValidators = [
  body('accountHolderName').trim().notEmpty().withMessage('Account holder name is required'),
  body('bankAccountNumber').trim().isLength({ min: 6, max: 50 }).withMessage('Valid account number is required'),
  body('bankIfscCode').trim().matches(/^[A-Z]{4}0[A-Z0-9]{6}$/i).withMessage('Valid IFSC code is required'),
  body('bankName').optional().trim().isLength({ max: 150 }),
  body('upiId').optional().trim().isLength({ max: 100 }),
  validate,
];

const bankDocumentValidators = [
  body('accountHolderName').trim().notEmpty().withMessage('Account holder name is required'),
  body('bankAccountNumber').trim().isLength({ min: 6, max: 50 }).withMessage('Valid account number is required'),
  body('bankIfscCode').trim().matches(/^[A-Z]{4}0[A-Z0-9]{6}$/i).withMessage('Valid IFSC code is required'),
  body('bankName').optional().trim().isLength({ max: 150 }),
  body('upiId').optional().trim().isLength({ max: 100 }),
  (req, res, next) => {
    if (!req.files || (!req.files.passbook && !req.files.cheque)) {
      return res.status(400).json({
        success: false,
        errors: [{ msg: 'At least one bank document (passbook or cheque) is required', field: 'documents' }]
      });
    }
    next();
  },
  validate,
];

router.use(authenticate);

router.get(
  '/bank-account/me',
  authorize('organizer', 'admin', 'super_admin'),
  settlementController.getMyBankAccount
);

router.get(
  '/bank-account',
  authorize('organizer', 'admin', 'super_admin'),
  settlementController.getMyBankAccount
);

router.put(
  '/bank-account/me',
  authorize('organizer', 'admin', 'super_admin'),
  bankValidators,
  settlementController.saveMyBankAccount
);

router.post(
  '/bank-account',
  authorize('organizer', 'admin', 'super_admin'),
  upload.fields([
    { name: 'passbook', maxCount: 1 },
    { name: 'cheque', maxCount: 1 }
  ]),
  bankDocumentValidators,
  settlementController.saveMyBankAccount
);

router.put(
  '/bank-account',
  authorize('organizer', 'admin', 'super_admin'),
  upload.fields([
    { name: 'passbook', maxCount: 1 },
    { name: 'cheque', maxCount: 1 }
  ]),
  bankDocumentValidators,
  settlementController.saveMyBankAccount
);

router.get(
  '/bank-account/:organizerId',
  authorize('admin', 'super_admin'),
  [param('organizerId').isInt({ min: 1 }), validate],
  settlementController.getOrganizerBankAccount
);

router.put(
  '/bank-account/:organizerId',
  authorize('admin', 'super_admin'),
  [param('organizerId').isInt({ min: 1 }), ...bankValidators],
  settlementController.saveOrganizerBankAccount
);

router.get(
  '/eligible',
  [
    query('organizerId').optional().isInt({ min: 1 }),
    query('eventId').optional().isInt({ min: 1 }),
    validate,
  ],
  settlementController.getEligibleGroups
);

router.get(
  '/summary/me',
  authorize('organizer'),
  settlementController.getMySummary
);

router.get(
  '/summary/:organizerId',
  authorize('admin', 'super_admin'),
  [param('organizerId').isInt({ min: 1 }), validate],
  settlementController.getOrganizerSummary
);

router.post(
  '/generate',
  authorize('admin', 'super_admin'),
  [
    body('organizerId').isInt({ min: 1 }).withMessage('Organizer ID is required'),
    body('eventId').isInt({ min: 1 }).withMessage('Event ID is required'),
    validate,
  ],
  settlementController.generateSettlement
);

router.post(
  '/generate/all-eligible',
  authorize('admin', 'super_admin'),
  settlementController.generateAllEligibleSettlements
);

router.get(
  '/',
  [
    query('organizerId').optional().isInt({ min: 1 }),
    query('eventId').optional().isInt({ min: 1 }),
    query('status').optional().isIn(['pending', 'processing', 'paid', 'failed', 'cancelled']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    validate,
  ],
  settlementController.listSettlements
);

router.get(
  '/:id',
  [param('id').isInt({ min: 1 }), validate],
  settlementController.getSettlementById
);

router.patch(
  '/bank-account/:organizerId/verify',
  authorize('admin', 'super_admin'),
  [
    param('organizerId').isInt({ min: 1 }),
    body('status').isIn(['verified', 'rejected']).withMessage('Status must be verified or rejected'),
    body('rejectionReason').optional().trim().isLength({ max: 500 }),
    validate,
  ],
  settlementController.verifyBankAccount
);

router.patch(
  '/:id/status',
  authorize('admin', 'super_admin'),
  [
    param('id').isInt({ min: 1 }),
    body('status').isIn(['pending', 'processing', 'paid', 'failed', 'cancelled']),
    body('payoutReference').optional().trim().isLength({ max: 120 }),
    body('bankReferenceId').optional().trim().isLength({ max: 120 }),
    body('notes').optional().trim().isLength({ max: 2000 }),
    validate,
  ],
  settlementController.updateSettlementStatus
);

module.exports = router;
