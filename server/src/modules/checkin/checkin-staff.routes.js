const express = require('express');
const { body, param, validationResult, query } = require('express-validator');
const { authenticate, authorize } = require('../../middleware/rbac');
const { PERMISSIONS } = require('../../config/permissions');
const checkinStaffController = require('./checkin-staff.controller');

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  return next();
};

// Assign check-in staff to event (organizer only)
router.post(
  '/events/:eventId/staff',
  authenticate,
  authorize('organizer'),
  [
    param('eventId').isInt({ min: 1 }).withMessage('Invalid event ID'),
    body('staffUserId').isInt({ min: 1 }).withMessage('Invalid staff user ID'),
    body('scannerId').optional().trim().isLength({ max: 100 }),
    body('notes').optional().trim().isLength({ max: 500 }),
    validate,
  ],
  checkinStaffController.assignStaff
);

// Approve staff assignment (super admin only)
router.patch(
  '/assignments/:assignmentId/approve',
  authenticate,
  authorize('super_admin'),
  [
    param('assignmentId').isInt({ min: 1 }).withMessage('Invalid assignment ID'),
    validate,
  ],
  checkinStaffController.approveAssignment
);

// Reject staff assignment (super admin only)
router.patch(
  '/assignments/:assignmentId/reject',
  authenticate,
  authorize('super_admin'),
  [
    param('assignmentId').isInt({ min: 1 }).withMessage('Invalid assignment ID'),
    body('rejectionReason').trim().notEmpty().withMessage('Rejection reason is required'),
    validate,
  ],
  checkinStaffController.rejectAssignment
);

// Get all staff assignments for an event (organizer or super admin)
router.get(
  '/events/:eventId/staff',
  authenticate,
  [
    param('eventId').isInt({ min: 1 }).withMessage('Invalid event ID'),
    validate,
  ],
  checkinStaffController.getEventStaff
);

// Get all pending assignments (super admin only)
router.get(
  '/assignments/pending',
  authenticate,
  authorize('super_admin'),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    validate,
  ],
  checkinStaffController.getPendingAssignments
);

// Remove staff assignment (organizer who assigned or super admin)
router.delete(
  '/assignments/:assignmentId',
  authenticate,
  [
    param('assignmentId').isInt({ min: 1 }).withMessage('Invalid assignment ID'),
    validate,
  ],
  checkinStaffController.removeAssignment
);

// Get staff performance metrics
router.get(
  '/staff/:staffUserId/performance',
  authenticate,
  [
    param('staffUserId').isInt({ min: 1 }).withMessage('Invalid staff user ID'),
    query('eventId').optional().isInt({ min: 1 }),
    query('startDate').optional().isISO8601().toDate(),
    query('endDate').optional().isISO8601().toDate(),
    validate,
  ],
  checkinStaffController.getStaffPerformance
);

module.exports = router;
