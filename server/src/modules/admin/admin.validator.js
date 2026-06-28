const { body, param, query } = require('express-validator');

const registerValidator = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 150 }),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must include uppercase, lowercase, number and special character'),
  body('adminSecret').notEmpty().withMessage('Admin registration secret is required'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
];

const loginValidator = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const updateProfileValidator = [
  body('name').optional().trim().isLength({ min: 2, max: 150 }).withMessage('Name must be 2–150 characters'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
];

const changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must include uppercase, lowercase, number and special character'),
];

const resetPasswordValidator = [
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must include uppercase, lowercase, number and special character'),
];

const idParamValidator = [
  param('id').isInt({ min: 1 }).withMessage('Invalid admin ID'),
];

module.exports = {
  registerValidator, loginValidator, updateProfileValidator,
  changePasswordValidator, resetPasswordValidator, idParamValidator,
};
