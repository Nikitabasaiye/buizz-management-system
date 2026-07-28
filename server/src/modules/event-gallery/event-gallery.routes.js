const express = require('express');
const router = express.Router();
const controller = require('./event-gallery.controller');
const { authenticate } = require('../../middleware/rbac');
const { authorize } = require('../../middleware/rbac');

// Get all images for an event (public)
router.get('/event/:eventId', controller.getEventImages);

// Get featured image for event (public)
router.get('/event/:eventId/featured', controller.getFeaturedImage);

// All write routes require authentication
router.use(authenticate);

// Add image to event gallery (organizer only)
router.post('/event/:eventId', authorize('organizer', 'admin', 'super_admin'), controller.addImage);

// Update gallery image (organizer only)
router.put('/image/:imageId', authorize('organizer', 'admin', 'super_admin'), controller.updateImage);

// Delete gallery image (organizer only)
router.delete('/image/:imageId', authorize('organizer', 'admin', 'super_admin'), controller.deleteImage);

// Reorder images in gallery (organizer only)
router.put('/event/:eventId/reorder', authorize('organizer', 'admin', 'super_admin'), controller.reorderImages);

// Set featured image for event (organizer only)
router.put('/event/:eventId/featured/:imageId', authorize('organizer', 'admin', 'super_admin'), controller.setFeaturedImage);

module.exports = router;
