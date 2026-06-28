const { body, validationResult } = require('express-validator');

const validateEventCreation = [
  body('title').notEmpty().trim().withMessage('Event title is required'),
  body('description').notEmpty().trim().withMessage('Event description is required'),
  body('category').notEmpty().withMessage('Event category is required'),
  body('customCategory').optional().trim(),
  body('type').isIn(['online', 'offline', 'hybrid', 'custom']).withMessage('Invalid event type'),
  body('customType').optional().trim(),
  body('startDate').notEmpty().isISO8601().withMessage('Valid start date is required'),
  body('endDate').notEmpty().isISO8601().withMessage('Valid end date is required'),
  body('totalSeats').optional().isInt({ min: 1 }).withMessage('Total seats must be a positive number'),
  
  // Ticket types validation - accept both array and object
  body('ticketTypes').custom((value) => {
    // Convert object to array if needed
    const ticketTypesArray = Array.isArray(value) ? value : Object.values(value);
    
    if (!Array.isArray(ticketTypesArray) || ticketTypesArray.length === 0) {
      throw new Error('At least one ticket type is required');
    }
    
    // Validate each ticket type
    ticketTypesArray.forEach((tt, index) => {
      if (!tt.name || tt.name.trim() === '') {
        throw new Error(`Ticket type ${index + 1}: name is required`);
      }
      if (tt.price === undefined || tt.price === null) {
        throw new Error(`Ticket type ${index + 1}: price is required`);
      }
      if (typeof tt.price !== 'number' || tt.price < 0) {
        throw new Error(`Ticket type ${index + 1}: price must be 0 or greater`);
      }
      if (!tt.quantity || typeof tt.quantity !== 'number' || tt.quantity < 1) {
        throw new Error(`Ticket type ${index + 1}: quantity must be at least 1`);
      }
    });
    
    return true;
  }),
  
  (req, res, next) => {
    // Convert ticketTypes object to array if needed
    if (req.body.ticketTypes && !Array.isArray(req.body.ticketTypes)) {
      req.body.ticketTypes = Object.values(req.body.ticketTypes);
    }
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        errors: errors.array()
      });
    }
    next();
  }
];

const validateEventUpdate = [
  body('title').optional().trim().notEmpty().withMessage('Event title cannot be empty'),
  body('description').optional().trim().notEmpty().withMessage('Event description cannot be empty'),
  body('category').optional().notEmpty().withMessage('Event category cannot be empty'),
  body('customCategory').optional().trim(),
  body('type').optional().isIn(['online', 'offline', 'hybrid', 'custom']).withMessage('Invalid event type'),
  body('customType').optional().trim(),
  body('startDate').optional().isISO8601().withMessage('Valid start date is required'),
  body('endDate').optional().isISO8601().withMessage('Valid end date is required'),
  body('totalSeats').optional().isInt({ min: 1 }).withMessage('Total seats must be a positive number'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        errors: errors.array()
      });
    }
    next();
  }
];

module.exports = {
  validateEventCreation,
  validateEventUpdate
};
