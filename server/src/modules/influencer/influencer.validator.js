const { body, param, query } = require('express-validator');

const registerValidator = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 150 }),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must include uppercase, lowercase, number and special character'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
  body('niche').optional().trim().isLength({ max: 100 }).withMessage('Niche too long'),
  body('bio').optional().trim().isLength({ max: 1000 }).withMessage('Bio must not exceed 1000 characters'),
];

const loginValidator = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const updateProfileValidator = [
  body('name').optional().trim().isLength({ min: 2, max: 150 }),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
  body('niche').optional().trim().isLength({ max: 100 }),
  body('bio').optional().trim().isLength({ max: 1000 }),
  body('instagramHandle').optional().trim().isLength({ max: 100 }),
  body('youtubeHandle').optional().trim().isLength({ max: 100 }),
  body('twitterHandle').optional().trim().isLength({ max: 100 }),
  body('facebookHandle').optional().trim().isLength({ max: 100 }),
];

const bankDetailsValidator = [
  body('bankAccountName').notEmpty().withMessage('Account holder name is required'),
  body('bankAccountNumber').notEmpty().isNumeric().withMessage('Valid account number required'),
  body('bankIfsc').notEmpty().matches(/^[A-Z]{4}0[A-Z0-9]{6}$/).withMessage('Invalid IFSC code'),
  body('bankName').notEmpty().withMessage('Bank name is required'),
];

const changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must include uppercase, lowercase, number and special character'),
];

const resetPasswordValidator = [
  body('password').isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must include uppercase, lowercase, number and special character'),
];

const idParamValidator = [param('id').isInt({ min: 1 }).withMessage('Invalid influencer ID')];

module.exports = {
  registerValidator, loginValidator, updateProfileValidator,
  bankDetailsValidator, changePasswordValidator, resetPasswordValidator, idParamValidator,
};
