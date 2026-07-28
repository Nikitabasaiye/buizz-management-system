const express = require('express');
const router = express.Router();
const controller = require('./ticket-scan.controller');
const { authenticate } = require('../../middleware/rbac');
const { authorize } = require('../../middleware/rbac');

// All routes require authentication
router.use(authenticate);

// Scan ticket QR code (check-in staff only)
router.post('/scan/:ticketNumber', authorize('organizer', 'checkin_staff', 'admin', 'super_admin'), controller.scanTicket);

// Verify ticket without scanning (view only)
router.get('/verify/:ticketNumber', authorize('organizer', 'checkin_staff', 'admin', 'super_admin'), controller.verifyTicket);

// Get scan statistics for an event
router.get('/stats/event/:eventId', authorize('organizer', 'checkin_staff', 'admin', 'super_admin'), controller.getEventScanStats);

// Get recent scans for an event
router.get('/recent/event/:eventId', authorize('organizer', 'checkin_staff', 'admin', 'super_admin'), controller.getRecentScans);

module.exports = router;
