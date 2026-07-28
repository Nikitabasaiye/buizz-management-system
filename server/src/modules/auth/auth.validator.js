const { body } = require('express-validator');

const allowedRoles = ['user', 'customer', 'organizer', 'influencer', 'admin', 'super_admin'];

const registerSchema = [
  body('name').trim().notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 150 }).withMessage('Name must be 2-150 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must include uppercase, lowercase, number and special character'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
  body('role').optional().isIn(allowedRoles)
    .withMessage(`Role must be one of: ${allowedRoles.join(', ')}`),
  body('adminSecret').optional().isString().trim(),
  body('emailVerificationToken').optional().isString().isLength({ min: 64, max: 64 }),
  body('phoneVerificationToken').optional().isString().isLength({ min: 64, max: 64 }),
];

const loginSchema = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const resetPasswordSchema = [
  body('password').isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must include uppercase, lowercase, number and special character'),
];

const sendOtpSchema = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
];

const verifyOtpSchema = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('otp').trim().toUpperCase().matches(/^(?=(?:.*[A-Z]){3})(?=(?:.*\d){3})[A-Z0-9]{6}$/)
    .withMessage('OTP must contain exactly 3 letters and 3 digits'),
];

const sendPasswordResetOtpSchema = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
];

const verifyPasswordResetOtpSchema = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('otp').trim().toUpperCase().matches(/^(?=(?:.*[A-Z]){3})(?=(?:.*\d){3})[A-Z0-9]{6}$/)
    .withMessage('OTP must contain exactly 3 letters and 3 digits'),
];

const completePasswordResetSchema = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('verificationToken').isString().isLength({ min: 64, max: 64 })
    .withMessage('Valid password reset verification is required'),
  body('password').isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must include uppercase, lowercase, number and special character'),
];

const sendPhoneOtpSchema = [
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('email').optional().isEmail().normalizeEmail(),
  body('purpose').optional().isIn(['signup', 'login', 'offline_booking']),
  body('loginRole').optional().isIn(['customer', 'organizer']),
  body('deliveryChannel').optional().isIn(['auto', 'whatsapp', 'email']),
];

const verifyPhoneOtpSchema = [
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('otp').trim().toUpperCase().matches(/^(?=(?:.*[A-Z]){3})(?=(?:.*\d){3})[A-Z0-9]{6}$/)
    .withMessage('OTP must contain exactly 3 letters and 3 digits'),
  body('purpose').optional().isIn(['signup', 'login', 'offline_booking']),
  body('loginRole').optional().isIn(['customer', 'organizer']),
];

module.exports = {
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
};
