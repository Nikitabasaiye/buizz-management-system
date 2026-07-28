const express = require('express');
const { authenticate, authorize } = require('../../middleware/rbac');
const supportMessageController = require('./support-message.controller');
const { body, param, validationResult } = require('express-validator');
const { upload } = require('../../config/upload');

const router = express.Router();

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

// All routes require authentication
router.use(authenticate);

// Send message in support ticket
router.post(
  '/tickets/:ticketId/messages',
  [
    param('ticketId').notEmpty().withMessage('Ticket ID is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('messageType').optional().isIn(['text', 'image', 'document', 'system']).withMessage('Invalid message type'),
    body('isInternal').optional().isBoolean().withMessage('isInternal must be boolean'),
    validate
  ],
  supportMessageController.sendMessage
);

// Get all messages for a ticket
router.get(
  '/tickets/:ticketId/messages',
  [
    param('ticketId').notEmpty().withMessage('Ticket ID is required'),
    validate
  ],
  supportMessageController.getTicketMessages
);

// Upload attachment to message
router.post(
  '/tickets/:ticketId/messages/:messageId/attachments',
  upload.single('file'),
  [
    param('ticketId').notEmpty().withMessage('Ticket ID is required'),
    param('messageId').isInt({ min: 1 }).withMessage('Invalid message ID'),
    validate
  ],
  supportMessageController.uploadAttachment
);

// Get ticket activity log
router.get(
  '/tickets/:ticketId/activity',
  [
    param('ticketId').notEmpty().withMessage('Ticket ID is required'),
    validate
  ],
  supportMessageController.getTicketActivity
);

// Mark messages as read
router.post(
  '/tickets/:ticketId/read',
  [
    param('ticketId').notEmpty().withMessage('Ticket ID is required'),
    validate
  ],
  supportMessageController.markAsRead
);

// Escalate ticket (admin/super_admin only)
router.post(
  '/tickets/:ticketId/escalate',
  authorize('admin', 'super_admin'),
  [
    param('ticketId').notEmpty().withMessage('Ticket ID is required'),
    body('escalationLevel').isIn(['level_1', 'level_2', 'level_3']).withMessage('Invalid escalation level'),
    body('notes').optional().trim(),
    validate
  ],
  supportMessageController.escalateTicket
);

// Submit customer satisfaction rating
router.post(
  '/tickets/:ticketId/satisfaction',
  [
    param('ticketId').notEmpty().withMessage('Ticket ID is required'),
    body('satisfaction').isIn(['very_dissatisfied', 'dissatisfied', 'neutral', 'satisfied', 'very_satisfied']).withMessage('Invalid satisfaction rating'),
    body('notes').optional().trim(),
    validate
  ],
  supportMessageController.submitSatisfaction
);

module.exports = router;
