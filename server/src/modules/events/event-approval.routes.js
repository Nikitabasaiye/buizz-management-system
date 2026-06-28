const express = require('express');
const approvalController = require('./event-approval.controller');
const { authenticate, authorize, auditLog } = require('../../middleware/rbac');

const router = express.Router();

router.use(authenticate);

// View approvals (admin & super_admin)
router.get('/', authorize('admin', 'super_admin'), auditLog('approval:list'), approvalController.getAllRequests);
router.get('/stats', authorize('admin', 'super_admin'), auditLog('approval:stats'), approvalController.getStats);
router.get('/my-requests', auditLog('approval:my-requests'), approvalController.getMyRequests);
router.get('/:id', authorize('admin', 'super_admin'), auditLog('approval:view'), approvalController.getRequestById);

// Admin review (admin only)
router.post('/:id/admin-review', authorize('admin'), auditLog('approval:admin-review'), approvalController.adminReview);

// Super admin review (super_admin only)
router.post('/:id/super-admin-review', authorize('super_admin'), auditLog('approval:super-admin-review'), approvalController.superAdminReview);

module.exports = router;
