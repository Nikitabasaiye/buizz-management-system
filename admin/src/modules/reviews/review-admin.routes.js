const express = require('express');
const router = express.Router();
const reviewAdminController = require('./review-admin.controller');
const { authenticate } = require('../../middleware/auth');
const { checkPermission } = require('../../middleware/rbac');

// All routes require authentication and admin permissions
router.use(authenticate);

router.get('/', checkPermission('reviews', 'read'), reviewAdminController.getAllReviews);
router.put('/:reviewId/status', checkPermission('reviews', 'update'), reviewAdminController.updateReviewStatus);
router.delete('/:reviewId', checkPermission('reviews', 'delete'), reviewAdminController.deleteReview);
router.get('/reports', checkPermission('reviews', 'read'), reviewAdminController.getReviewReports);
router.put('/reports/:reportId', checkPermission('reviews', 'update'), reviewAdminController.updateReportStatus);

module.exports = router;
