const express = require('express');
const { getMySQLPool } = require('../../database/mysql');
const { authenticate, authorize } = require('../../middleware/rbac');
const { AppError } = require('../../middleware/errorHandler');
const eventApprovalService = require('../../../../server/src/modules/events/event-approval.service');

const router = express.Router();

router.use(authenticate);

// Get all approvals
router.get('/', authorize('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const result = await eventApprovalService.getAllRequests(parseInt(page), parseInt(limit), status);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// Get approval stats
router.get('/stats', authorize('admin', 'super_admin'), async (req, res, next) => {
  try {
    const stats = await eventApprovalService.getApprovalStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

// Get my requests
router.get('/my-requests', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await eventApprovalService.getMyRequests(req.user.id, parseInt(page), parseInt(limit));
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// Get specific approval
router.get('/:id', authorize('admin', 'super_admin'), async (req, res, next) => {
  try {
    const request = await eventApprovalService.getRequestById(req.params.id);
    res.json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
});

// Admin review
router.post('/:id/admin-review', authorize('admin'), async (req, res, next) => {
  try {
    const { status, comments } = req.body;
    let result;
    
    if (status === 'approved') {
      result = await eventApprovalService.approveByAdmin(req.params.id, req.user.id, comments);
      res.json({ 
        success: true, 
        message: 'Approval request updated successfully. Pending super admin approval.',
        data: result 
      });
    } else if (status === 'rejected') {
      result = await eventApprovalService.rejectByAdmin(req.params.id, req.user.id, comments);
      res.json({ 
        success: true, 
        message: 'Approval request rejected.',
        data: result 
      });
    } else {
      throw new AppError('Invalid status. Must be "approved" or "rejected"', 400);
    }
  } catch (error) {
    next(error);
  }
});

// Super admin review
router.post('/:id/super-admin-review', authorize('super_admin'), async (req, res, next) => {
  try {
    const { status, comments } = req.body;
    let result;
    
    if (status === 'approved') {
      result = await eventApprovalService.approveBySuperAdmin(req.params.id, req.user.id, comments);
      res.json({ 
        success: true, 
        message: 'Event created successfully after approval',
        data: result 
      });
    } else if (status === 'rejected') {
      result = await eventApprovalService.rejectBySuperAdmin(req.params.id, req.user.id, comments);
      res.json({ 
        success: true, 
        message: 'Approval request rejected.',
        data: result 
      });
    } else {
      throw new AppError('Invalid status. Must be "approved" or "rejected"', 400);
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
