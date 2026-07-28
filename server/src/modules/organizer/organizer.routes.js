const express = require('express');
const organizerController = require('./organizer.controller');
const { validate } = require('../../validators');
const { body, param } = require('express-validator');

const router = express.Router();

// ── Public: Auth ──────────────────────────────────────────────────────────────
router.post('/register', validate([
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('phone')
    .optional({ checkFalsy: true })
    .custom((value) => {
      const digits = String(value).replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 15;
    })
    .withMessage('Valid phone number required'),
  body('businessName').optional().trim(),
  body('businessType').optional().trim(),
  body('city').optional().trim(),
  body('state').optional().trim(),
  body('pincode').optional().trim(),
  body('emailVerificationToken').isString().isLength({ min: 64, max: 64 })
    .withMessage('Email verification is required'),
  body('phoneVerificationToken').isString().isLength({ min: 64, max: 64 })
    .withMessage('Phone verification is required'),
]), organizerController.register);

router.post('/login', validate([
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
]), organizerController.login);

router.post('/refresh', organizerController.refreshToken);
router.get('/verify-email/:token', organizerController.verifyEmail);
router.get('/verify-email', organizerController.verifyEmail);
router.post('/forgot-password', organizerController.forgotPassword);
router.post('/reset-password/:token', validate([
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
]), organizerController.resetPassword);

// ── Protected: Organizer profile ──────────────────────────────────────────────
const { authenticateOrganizer } = require('./organizer.middleware');

router.post('/logout',   authenticateOrganizer, organizerController.logout);
router.get('/profile',   authenticateOrganizer, organizerController.getProfile);
router.put('/profile',   authenticateOrganizer, organizerController.updateProfile);
router.put('/bank',      authenticateOrganizer, organizerController.updateBankDetails);
router.put('/password',  authenticateOrganizer, organizerController.changePassword);
router.get('/analytics', authenticateOrganizer, organizerController.getAnalytics);
router.get('/events',    authenticateOrganizer, organizerController.getEvents);
router.get('/bookings',  authenticateOrganizer, organizerController.getBookings);
router.get('/revenue',   authenticateOrganizer, organizerController.getRevenue);
router.get('/attendees', authenticateOrganizer, organizerController.getAttendees);

// ── Admin: manage organizers ──────────────────────────────────────────────────
const { authenticate, requirePermission } = require('../../middleware/rbac');
const { PERMISSIONS } = require('../../config/permissions');

router.get('/',          authenticate, requirePermission(PERMISSIONS.ADMIN_ACCESS), organizerController.getAllOrganizers);
router.get('/:id',       authenticate, requirePermission(PERMISSIONS.ADMIN_ACCESS), organizerController.getOrganizerById);
router.patch('/:id/kyc', authenticate, requirePermission(PERMISSIONS.ADMIN_ACCESS), organizerController.verifyKyc);
router.delete('/:id',    authenticate, requirePermission(PERMISSIONS.ADMIN_ACCESS), organizerController.deactivate);

module.exports = router;
