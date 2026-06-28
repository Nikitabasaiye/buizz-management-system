const { body, param, query } = require('express-validator');

const createOrganizationValidator = [
  body('name')
    .notEmpty()
    .withMessage('Organization name is required')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  body('website')
    .optional()
    .isURL()
    .withMessage('Invalid website URL'),
  body('phone')
    .optional()
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .withMessage('Invalid phone number')
];

const updateOrganizationValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid organization ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  body('website')
    .optional()
    .isURL()
    .withMessage('Invalid website URL')
];

const getOrganizationValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid organization ID')
];

const addMemberValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid organization ID'),
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isInt({ min: 1 })
    .withMessage('Invalid user ID'),
  body('role')
    .optional()
    .isIn(['owner', 'admin', 'member'])
    .withMessage('Invalid role')
];

const removeMemberValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid organization ID'),
  param('memberId')
    .isInt({ min: 1 })
    .withMessage('Invalid member ID')
];

module.exports = {
  createOrganizationValidator,
  updateOrganizationValidator,
  getOrganizationValidator,
  addMemberValidator,
  removeMemberValidator
};
