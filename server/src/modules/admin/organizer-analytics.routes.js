const express = require('express');
const { param, query, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../../middleware/rbac');
const organizerAnalyticsController = require('./organizer-analytics.controller');

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  return next();
};

// All routes require authentication and super_admin role
router.use(authenticate);
router.use(authorize('super_admin'));

// Get all organizers with summary stats
router.get(
  '/organizers',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('status').optional().isIn(['pending', 'verified', 'rejected']).withMessage('Invalid status'),
    query('search').optional().trim().isLength({ max: 255 }).withMessage('Search term too long'),
    validate,
  ],
  organizerAnalyticsController.getAllOrganizers
);

// Get comprehensive organizer dashboard
router.get(
  '/organizers/:organizerId/dashboard',
  [
    param('organizerId').isInt({ min: 1 }).withMessage('Invalid organizer ID'),
    validate,
  ],
  organizerAnalyticsController.getOrganizerDashboard
);

// Get organizer profile details
router.get(
  '/organizers/:organizerId/profile',
  [
    param('organizerId').isInt({ min: 1 }).withMessage('Invalid organizer ID'),
    validate,
  ],
  organizerAnalyticsController.getOrganizerProfile
);

// Get organizer events with performance metrics
router.get(
  '/organizers/:organizerId/events',
  [
    param('organizerId').isInt({ min: 1 }).withMessage('Invalid organizer ID'),
    validate,
  ],
  organizerAnalyticsController.getOrganizerEvents
);

// Get organizer revenue analysis with profit/loss
router.get(
  '/organizers/:organizerId/revenue',
  [
    param('organizerId').isInt({ min: 1 }).withMessage('Invalid organizer ID'),
    validate,
  ],
  organizerAnalyticsController.getOrganizerRevenue
);

// Get organizer booking summary and statistics
router.get(
  '/organizers/:organizerId/bookings',
  [
    param('organizerId').isInt({ min: 1 }).withMessage('Invalid organizer ID'),
    validate,
  ],
  organizerAnalyticsController.getOrganizerBookings
);

// Get event performance metrics
router.get(
  '/organizers/:organizerId/performance',
  [
    param('organizerId').isInt({ min: 1 }).withMessage('Invalid organizer ID'),
    validate,
  ],
  organizerAnalyticsController.getEventPerformance
);

// Get KYC verification details
router.get(
  '/organizers/:organizerId/kyc',
  [
    param('organizerId').isInt({ min: 1 }).withMessage('Invalid organizer ID'),
    validate,
  ],
  organizerAnalyticsController.getKycDetails
);

// Get settlement history
router.get(
  '/organizers/:organizerId/settlements',
  [
    param('organizerId').isInt({ min: 1 }).withMessage('Invalid organizer ID'),
    validate,
  ],
  organizerAnalyticsController.getSettlementHistory
);

// Get audit history
router.get(
  '/organizers/:organizerId/audit',
  [
    param('organizerId').isInt({ min: 1 }).withMessage('Invalid organizer ID'),
    validate,
  ],
  organizerAnalyticsController.getAuditHistory
);

// Export organizer data
router.get(
  '/organizers/:organizerId/export',
  [
    param('organizerId').isInt({ min: 1 }).withMessage('Invalid organizer ID'),
    query('format').optional().isIn(['json', 'csv']).withMessage('Format must be json or csv'),
    validate,
  ],
  organizerAnalyticsController.exportOrganizerData
);

module.exports = router;