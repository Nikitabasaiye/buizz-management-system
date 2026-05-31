const express = require('express');
const eventController = require('./event.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { USER_ROLES } = require('../../constants');

const router = express.Router();

router.get('/', eventController.getEvents);
router.get('/slug/:slug', eventController.getEventBySlug);
router.get('/:id', eventController.getEventById);

router.use(authenticate);
router.post('/', authorize(USER_ROLES.ORGANIZER, USER_ROLES.ADMIN), eventController.createEvent);
router.put('/:id', authorize(USER_ROLES.ORGANIZER, USER_ROLES.ADMIN), eventController.updateEvent);
router.delete('/:id', authorize(USER_ROLES.ORGANIZER, USER_ROLES.ADMIN), eventController.deleteEvent);
router.patch('/:id/publish', authorize(USER_ROLES.ORGANIZER, USER_ROLES.ADMIN), eventController.publishEvent);

module.exports = router;
