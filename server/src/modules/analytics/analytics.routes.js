const express = require('express');
const { authenticate, requireAnyPermission } = require('../../middleware/rbac');
const { PERMISSIONS } = require('../../config/permissions');
const analyticsController = require('./analytics.controller');

const router = express.Router();

router.post('/visitors/track', analyticsController.trackVisitor);
router.use(authenticate);
router.get('/visitors/summary', requireAnyPermission(PERMISSIONS.ANALYTICS_READ, PERMISSIONS.ADMIN_ANALYTICS), analyticsController.getVisitorSummary);
router.get('/dashboard', requireAnyPermission(PERMISSIONS.ANALYTICS_READ, PERMISSIONS.ADMIN_ANALYTICS), analyticsController.getDashboard);
router.get('/', requireAnyPermission(PERMISSIONS.ANALYTICS_READ, PERMISSIONS.ADMIN_ANALYTICS), analyticsController.getDashboard);
router.get('/events/:eventId', requireAnyPermission(PERMISSIONS.ANALYTICS_READ, PERMISSIONS.ADMIN_ANALYTICS), analyticsController.getEventAnalytics);

module.exports = router;
