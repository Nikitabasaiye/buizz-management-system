const express = require('express');
const influencerController = require('./influencer.controller');
const { authenticateInfluencer, requireVerifiedInfluencer } = require('./influencer.middleware');
const { authenticateAdmin, requireSuperAdmin } = require('../admin/admin.middleware');
const { validate } = require('../../validators');
const {
  registerValidator, loginValidator, updateProfileValidator,
  bankDetailsValidator, changePasswordValidator, resetPasswordValidator, idParamValidator,
} = require('./influencer.validator');

const router = express.Router();

// ── Public: Auth ──────────────────────────────────────────────────────────────
router.post('/register',              validate(registerValidator),       influencerController.register);
router.post('/login',                 validate(loginValidator),          influencerController.login);
router.post('/refresh',                                                   influencerController.refreshToken);
router.get('/verify-email/:token',                                        influencerController.verifyEmail);
router.get('/verify-email',                                               influencerController.verifyEmail);
router.post('/forgot-password',                                           influencerController.forgotPassword);
router.post('/reset-password/:token', validate(resetPasswordValidator),   influencerController.resetPassword);

// ── Protected: Influencer profile ─────────────────────────────────────────────
router.post('/logout',   authenticateInfluencer,                                                             influencerController.logout);
router.get('/profile',   authenticateInfluencer,                                                             influencerController.getProfile);
router.put('/profile',   authenticateInfluencer, requireVerifiedInfluencer, validate(updateProfileValidator), influencerController.updateProfile);
router.put('/bank',      authenticateInfluencer, requireVerifiedInfluencer, validate(bankDetailsValidator),   influencerController.updateBankDetails);
router.put('/password',  authenticateInfluencer, validate(changePasswordValidator),                           influencerController.changePassword);

// ── Admin: manage influencers ─────────────────────────────────────────────────
router.get('/',          authenticateAdmin,                                                                   influencerController.getAllInfluencers);
router.delete('/:id',    authenticateAdmin, requireSuperAdmin, validate(idParamValidator),                   influencerController.deactivate);

module.exports = router;
