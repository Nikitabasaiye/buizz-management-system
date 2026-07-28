const express = require('express');
const authController = require('./auth.controller');
const { authenticate } = require('../../middleware/rbac');
const { validate } = require('../../validators');
const {
  registerSchema,
  loginSchema,
  resetPasswordSchema,
  sendOtpSchema,
  verifyOtpSchema,
  sendPasswordResetOtpSchema,
  verifyPasswordResetOtpSchema,
  completePasswordResetSchema,
  sendPhoneOtpSchema,
  verifyPhoneOtpSchema,
} = require('./auth.validator');

const router = express.Router();

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/register', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Registration endpoint is available. Send a POST request with name, email, password, and optional phone/role.',
    method: 'POST',
    path: '/api/v1/auth/register',
  });
});
router.post('/register', validate(registerSchema), authController.register);
router.post('/login',  validate(loginSchema),   authController.login);
router.post('/google',                           authController.googleLogin);
router.post('/facebook',                         authController.facebookLogin);
router.post('/social',                           authController.socialLogin);
router.post('/refresh-token',  authController.refreshToken);
router.get('/verify-email/:token',  authController.verifyEmail);
router.get('/verify-email',   authController.verifyEmail);
router.post('/forgot-password',                                      authController.forgotPassword);
router.post('/reset-password/:token', validate(resetPasswordSchema), authController.resetPassword);
router.post('/reset-password',        validate(resetPasswordSchema), authController.resetPassword);
router.post('/send-otp',              validate(sendOtpSchema),       authController.sendOtp);
router.post('/verify-otp',            validate(verifyOtpSchema),     authController.verifyOtp);
router.post('/password-reset/send-otp', validate(sendPasswordResetOtpSchema), authController.sendPasswordResetOtp);
router.post('/password-reset/verify-otp', validate(verifyPasswordResetOtpSchema), authController.verifyPasswordResetOtp);
router.post('/password-reset/complete', validate(completePasswordResetSchema), authController.completePasswordReset);
// Phone OTP — delivered via email (no SMS gateway configured)
router.post('/send-phone-otp',   validate(sendPhoneOtpSchema),   authController.sendPhoneOtp);
router.post('/verify-phone-otp', validate(verifyPhoneOtpSchema), authController.verifyPhoneOtp);

// ── Protected ─────────────────────────────────────────────────────────────────
router.post('/logout', authenticate, authController.logout);

module.exports = router;
