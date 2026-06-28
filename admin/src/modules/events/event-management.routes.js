const express = require('express');
const { authenticate, authorize } = require('../../middleware/rbac');

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin', 'super_admin'));

// Import event routes from server
const eventController = require('../../../../server/src/modules/events/event.controller');

router.get('/', eventController.getEvents);
router.get('/:id', eventController.getEventById);
router.post('/', eventController.createEvent);
router.put('/:id', eventController.updateEvent);
router.delete('/:id', eventController.deleteEvent);

module.exports = router;
