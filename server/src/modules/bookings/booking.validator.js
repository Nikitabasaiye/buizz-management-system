const { body } = require('express-validator');

const initiateBookingValidation = [
  body('eventId')
    .notEmpty().withMessage('Event ID is required')
    .isInt({ min: 1 }).withMessage('Event ID must be a valid integer'),
  body('ticketTypeId')
    .notEmpty().withMessage('Ticket Type ID is required')
    .isInt({ min: 1 }).withMessage('Ticket Type ID must be a valid integer'),
  body('quantity')
    .optional()
    .isInt({ min: 1, max: 10 }).withMessage('Quantity must be between 1 and 10')
];

module.exports = {
  initiateBookingValidation
};
