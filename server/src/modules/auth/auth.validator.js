const { body } = require('express-validator');

const allowedRoles = ['user', 'organizer', 'influencer', 'admin', 'super_admin'];

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

module.exports = { registerSchema, loginSchema, resetPasswordSchema };
