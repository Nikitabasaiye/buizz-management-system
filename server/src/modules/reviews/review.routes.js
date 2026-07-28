const express = require('express');
const router = express.Router();
const reviewController = require('./review.controller');
const { authenticate, authorize } = require('../../middleware/auth');

// Public routes
router.get('/event/:eventId', reviewController.getEventReviews);

// Protected routes (require authentication)
router.use(authenticate);

router.post('/', reviewController.createReview);
router.get('/my-reviews', reviewController.getUserReviews);
router.put('/:reviewId', reviewController.updateReview);
router.delete('/:reviewId', reviewController.deleteReview);
router.post('/:reviewId/helpful', reviewController.markHelpful);
router.post('/:reviewId/report', reviewController.reportReview);

// Super Admin routes
router.put('/:reviewId/admin-edit', authorize('super_admin'), reviewController.adminEditReview);
router.patch('/:reviewId/status', authorize('super_admin'), reviewController.updateReviewStatus);
router.delete('/:reviewId/admin-delete', authorize('super_admin'), reviewController.adminDeleteReview);
router.get('/admin/all', authorize('super_admin'), reviewController.getAllReviews);

module.exports = router;
