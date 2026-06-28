const express = require('express');
const auditController = require('./audit.controller');
const { authenticate, authorize } = require('../../middleware/rbac');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// User can see their own activity
router.get('/my-activity', auditController.getMyActivity);

// Super admin routes
router.get('/logs', 
  authorize('super_admin'),
  auditController.getAuditLogs
);

router.get('/dashboard-stats',
  authorize('super_admin'),
  auditController.getDashboardStats
);

router.get('/user/:userId',
  authorize('super_admin', 'admin'),
  auditController.getUserActivity
);

router.get('/organizer/:organizerId',
  authorize('super_admin'),
  auditController.getOrganizerHistory
);

router.get('/event/:eventId/approvals',
  authorize('super_admin', 'admin'),
  auditController.getEventApprovalHistory
);

router.get('/export',
  authorize('super_admin'),
  auditController.exportAuditLogs
);

module.exports = router;
