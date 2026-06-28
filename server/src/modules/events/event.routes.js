const express = require('express');
const eventController = require('./event.controller');
const { authenticate, requirePermission, auditLog } = require('../../middleware/rbac');
const { requireKycVerification } = require('../../middleware/kycVerification');
const { PERMISSIONS } = require('../../config/permissions');
const { validateEventCreation, validateEventUpdate } = require('./event.validator');

const router = express.Router();

// Public routes
router.get('/', eventController.getEvents);
router.get('/slug/:slug', eventController.getEventBySlug);
router.get('/:id', eventController.getEventById);

// Protected routes
router.use(authenticate);

router.post('/',
  requirePermission(PERMISSIONS.EVENT_CREATE),
  requireKycVerification, // KYC check for event creation
  validateEventCreation,
  auditLog('event:create'),
  eventController.createEvent
);

router.put('/:id',
  requirePermission(PERMISSIONS.EVENT_UPDATE),
  validateEventUpdate,
  auditLog('event:update'),
  eventController.updateEvent
);

router.delete('/:id',
  requirePermission(PERMISSIONS.EVENT_DELETE),
  auditLog('event:delete'),
  eventController.deleteEvent
);

router.patch('/:id/publish',
  requirePermission(PERMISSIONS.EVENT_PUBLISH),
  requireKycVerification, // KYC check for event publishing
  auditLog('event:publish'),
  eventController.publishEvent
);

module.exports = router;
