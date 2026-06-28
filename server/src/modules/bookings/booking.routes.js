const express = require('express');
const { authenticate, authorize, requirePermission, auditLog } = require('../../middleware/rbac');
const { PERMISSIONS } = require('../../config/permissions');
const bookingController = require('./booking.controller');
const offlineBookingController = require('./offline-booking.controller');
const { body, param, query, validationResult } = require('express-validator');

const router = express.Router();

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

router.post('/phonepe/callback', bookingController.handlePhonePeCallback);

router.use(authenticate);

router.get('/', bookingController.getUserBookings);

router.post(
  '/offline',
  requirePermission(PERMISSIONS.TICKET_CREATE),
  auditLog('booking:offline_create'),
  [
    body('eventId').notEmpty().isInt({ min: 1 }).withMessage('Valid event ID is required'),
    body('ticketTypeId').notEmpty().isInt({ min: 1 }).withMessage('Valid ticket type ID is required'),
    body('quantity').isInt({ min: 1, max: 10 }).withMessage('Quantity must be between 1 and 10'),
    body('customerEmail').isEmail().withMessage('Valid email is required'),
    body('customerName').notEmpty().withMessage('Customer name is required'),
    body('customerPhone').optional().isMobilePhone().withMessage('Valid phone number required'),
    validate
  ],
  offlineBookingController.createOfflineBooking
);

router.get('/offline/list', requirePermission(PERMISSIONS.TICKET_LIST), offlineBookingController.getOfflineBookings);

router.get('/limit/:eventId', offlineBookingController.checkTicketLimit);

router.post(
  '/initiate',
  [
    body('eventId').notEmpty().isInt({ min: 1 }).withMessage('Valid event ID is required'),
    body('ticketTypeId').notEmpty().isInt({ min: 1 }).withMessage('Valid ticket type ID is required'),
    body('quantity').optional().isInt({ min: 1, max: 10 }).withMessage('Quantity must be between 1 and 10'),
    validate
  ],
  bookingController.initiateBooking
);

router.get(
  '/verify/:orderId',
  [
    param('orderId').notEmpty().withMessage('Order ID is required'),
    validate
  ],
  bookingController.verifyPayment
);

// Privacy-protected organizer booking endpoints
router.get(
  '/organizer/:organizerId',
  authorize('organizer', 'admin', 'super_admin'),
  [
    param('organizerId').isInt({ min: 1 }).withMessage('Valid organizer ID is required'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    validate
  ],
  bookingController.getOrganizerBookings
);

// Privacy-protected event attendees endpoint
router.get(
  '/event/:eventId/attendees',
  authorize('organizer', 'admin', 'super_admin'),
  [
    param('eventId').isInt({ min: 1 }).withMessage('Valid event ID is required'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    validate
  ],
  bookingController.getEventAttendees
);

router.get(
  '/:orderId',
  [
    param('orderId').notEmpty().withMessage('Order ID is required'),
    validate
  ],
  bookingController.getBookingDetails
);

module.exports = router;
