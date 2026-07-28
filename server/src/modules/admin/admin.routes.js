const express = require('express');
const adminController = require('./admin.controller');
const { authenticateAdmin, requireSuperAdmin } = require('./admin.middleware');
const { validate } = require('../../validators');
const {
  registerValidator, loginValidator, updateProfileValidator,
  changePasswordValidator, resetPasswordValidator, idParamValidator,
} = require('./admin.validator');

const router = express.Router();

// ── Public: Auth ─────────────────────────────────────────────────────────────
router.post('/register',             validate(registerValidator),      adminController.register);
router.post('/login',                validate(loginValidator),         adminController.login);
router.post('/google',                                                  adminController.googleLogin);
router.post('/refresh',                                                adminController.refreshToken);
router.post('/super-admin/refresh',                                     adminController.refreshToken);
router.post('/forgot-password',                                        adminController.forgotPassword);
router.post('/reset-password/:token',validate(resetPasswordValidator), adminController.resetPassword);

// ── Protected: Admin profile ──────────────────────────────────────────────────
router.post('/logout',        authenticateAdmin,                                                        adminController.logout);
router.get('/profile',        authenticateAdmin,                                                        adminController.getProfile);
router.put('/profile',        authenticateAdmin, validate(updateProfileValidator),                      adminController.updateProfile);
router.put('/password',       authenticateAdmin, validate(changePasswordValidator),                     adminController.changePassword);

// ── Super Admin: manage admins ────────────────────────────────────────────────
router.get('/',               authenticateAdmin, requireSuperAdmin,                                     adminController.getAllAdmins);
router.delete('/:id',         authenticateAdmin, requireSuperAdmin, validate(idParamValidator),         adminController.deactivateAdmin);

// ── Admin: manage organizers ─────────────────────────────────────────────────
router.get('/organizers',     authenticateAdmin,                                                        adminController.getAllOrganizers);

// ── Admin: bookings management ────────────────────────────────────────────────
router.get('/bookings-management', authenticateAdmin,                                                 adminController.getBookings);

// ── Admin: payments management ───────────────────────────────────────────────
router.get('/payments',            authenticateAdmin,                                                 adminController.getPayments);

module.exports = router;
