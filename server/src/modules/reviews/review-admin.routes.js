const express = require('express');
const router = express.Router();
const reviewAdminController = require('./review-admin.controller');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);
router.use(authorize('admin', 'super_admin'));

router.get('/', reviewAdminController.getAllReviews);
router.put('/:reviewId/status', reviewAdminController.updateReviewStatus);
router.delete('/:reviewId', reviewAdminController.deleteReview);

module.exports = router;
