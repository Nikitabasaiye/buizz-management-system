const express = require('express');
const router = express.Router();
const controller = require('./checkin-staff.controller');
const { authenticate } = require('../../middleware/rbac');
const { authorize } = require('../../middleware/rbac');

// All routes require authentication
router.use(authenticate);

// Assign staff to event (organizer only)
router.post('/assign', authorize('organizer', 'admin', 'super_admin'), controller.assignStaff);

// Get all staff for an event (organizer only)
router.get('/event/:eventId', authorize('organizer', 'admin', 'super_admin'), controller.getEventStaff);

// Update staff assignment (organizer only)
router.put('/assignment/:assignmentId', authorize('organizer', 'admin', 'super_admin'), controller.updateAssignment);

// Remove staff assignment (organizer only)
router.delete('/assignment/:assignmentId', authorize('organizer', 'admin', 'super_admin'), controller.removeStaff);

// Get events where current user is assigned as check-in staff
router.get('/my-events', authorize('organizer', 'checkin_staff', 'admin', 'super_admin'), controller.getStaffEvents);

module.exports = router;
