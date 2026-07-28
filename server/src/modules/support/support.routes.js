const express = require('express');
const { authenticate, authorize, auditLog } = require('../../middleware/rbac');
const supportController = require('./support.controller');
const { body, param, validationResult } = require('express-validator');

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

router.use(authenticate);

// Create support ticket
router.post(
  '/',
  [
    body('subject').notEmpty().withMessage('Subject is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
    body('category').optional().isIn(['general', 'booking', 'payment', 'technical', 'account']).withMessage('Invalid category'),
    validate
  ],
  auditLog('support:create'),
  supportController.createTicket
);

// Get all support tickets (admin/super_admin)
router.get(
  '/',
  authorize('admin', 'super_admin', 'super-admin'),
  auditLog('support:list'),
  supportController.getAllTickets
);

// Get support ticket stats (admin/super_admin)
router.get(
  '/stats',
  authorize('admin', 'super_admin', 'super-admin'),
  auditLog('support:stats'),
  supportController.getTicketStats
);

// Get single support ticket
router.get(
  '/:id',
  auditLog('support:view'),
  supportController.getTicketById
);

// Update support ticket
router.put(
  '/:id',
  [
    body('status').optional().isIn(['open', 'in_progress', 'resolved', 'closed']).withMessage('Invalid status'),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
    validate
  ],
  auditLog('support:update'),
  supportController.updateTicket
);

// Delete support ticket
router.delete(
  '/:id',
  authorize('admin', 'super_admin', 'super-admin'),
  auditLog('support:delete'),
  supportController.deleteTicket
);

module.exports = router;
