const { body, param, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

const createPaymentValidation = [
  body('eventId').isInt().withMessage('Event ID must be a valid integer'),
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be greater than 0'),
  body('tickets').optional().isArray().withMessage('Tickets must be an array'),
  validate
];

const refundValidation = [
  body('orderId').notEmpty().withMessage('Order ID is required'),
  body('amount').optional().isFloat({ min: 1 }).withMessage('Amount must be greater than 0'),
  body('reason').optional().isString().withMessage('Reason must be a string'),
  validate
];

const orderIdValidation = [
  param('orderId').notEmpty().withMessage('Order ID is required'),
  validate
];

module.exports = {
  validate,
  createPaymentValidation,
  refundValidation,
  orderIdValidation
};
