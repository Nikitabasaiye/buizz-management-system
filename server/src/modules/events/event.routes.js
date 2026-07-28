const express = require('express');
const eventController = require('./event.controller');
const { authenticate, requirePermission, auditLog } = require('../../middleware/rbac');
const { requireKycVerification } = require('../../middleware/kycVerification');
const { PERMISSIONS } = require('../../config/permissions');
const { validateEventCreation, validateEventUpdate } = require('./event.validator');
const { upload } = require('../../config/upload');

const router = express.Router();

// Draft-specific routes
router.get('/drafts',
  authenticate,
  requirePermission(PERMISSIONS.EVENT_READ),
  eventController.getDraftEvents
);

// Public routes
router.get('/', eventController.getEvents);
router.get('/slug/:slug', eventController.getEventBySlug);
router.get('/:id', eventController.getEventById);

// Protected routes
router.use(authenticate);

router.post('/draft',
  auditLog('event:draft_save'),
  eventController.saveDraft
);

router.put('/draft/:id',
  requirePermission(PERMISSIONS.EVENT_UPDATE),
  auditLog('event:draft_update'),
  eventController.saveDraft
);

router.post('/',
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
  auditLog('event:publish'),
  eventController.publishEvent
);

router.patch('/:id/submit',
  requirePermission(PERMISSIONS.EVENT_UPDATE),
  auditLog('event:submit'),
  eventController.submitEventForReview
);

// Image upload endpoint
router.post('/upload-image',
  authenticate,
  upload.single('image'),
  eventController.uploadEventImage
);

module.exports = router;
