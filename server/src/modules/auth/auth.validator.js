const { body } = require('express-validator');
const { USER_ROLES } = require('../../constants');

const registerSchema = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
  body('role')
    .optional()
    .isIn([USER_ROLES.USER, USER_ROLES.ORGANIZER, USER_ROLES.INFLUENCER, USER_ROLES.ADMIN])
    .withMessage('Role must be user, organizer, influencer, or admin'),
  body('adminSecret').optional().isString().withMessage('Admin secret must be a string')
];

const loginSchema = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

module.exports = { registerSchema, loginSchema };
