const { param, query } = require('express-validator');

const getTicketValidator = [
  param('ticketNumber')
    .notEmpty()
    .withMessage('Ticket number is required')
    .matches(/^TKT[0-9]+$/)
    .withMessage('Invalid ticket number format')
];

const getEventTicketsValidator = [
  param('eventId')
    .isInt({ min: 1 })
    .withMessage('Invalid event ID'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

const getUserTicketsValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

module.exports = {
  getTicketValidator,
  getEventTicketsValidator,
  getUserTicketsValidator
};
