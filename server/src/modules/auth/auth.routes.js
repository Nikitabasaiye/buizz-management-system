const express = require('express');
const authController = require('./auth.controller');
const { authenticate } = require('../../middleware/rbac');
const { validate } = require('../../validators');
const { registerSchema, loginSchema, resetPasswordSchema } = require('./auth.validator');

const router = express.Router();

// ── Public ────────────────────────────────────────────────────────────────────
router.post('/register', validate(registerSchema), authController.register);
router.post('/login',  validate(loginSchema),   authController.login);
router.post('/refresh-token',  authController.refreshToken);
router.get('/verify-email/:token',  authController.verifyEmail);
router.get('/verify-email',   authController.verifyEmail);
router.post('/forgot-password',                                      authController.forgotPassword);
router.post('/reset-password/:token', validate(resetPasswordSchema), authController.resetPassword);
router.post('/reset-password',        validate(resetPasswordSchema), authController.resetPassword);

// ── Protected ─────────────────────────────────────────────────────────────────
router.post('/logout', authenticate, authController.logout);

module.exports = router;
