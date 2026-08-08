const express = require('express');
const { authenticate } = require('../../middleware/rbac');
const notificationService = require('./notification.service');
const { AppError } = require('../../middleware/errorHandler');

const router = express.Router();
const deliveryController = require('./notification.controller');


// Get user notifications
router.get('/', authenticate, async (req, res, next) => {
  try {
    const notifications = await notificationService.getUserNotifications(req.user.id, req.query);
    res.json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
});

// Get notification by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const notification = await notificationService.getNotification(req.params.id, req.user.id);
    res.json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
});

// Mark notification as read
router.patch('/:id/read', authenticate, async (req, res, next) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id, req.user.id);
    res.json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
});

// Mark all as read
router.patch('/read-all', authenticate, async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user.id);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
});

// Delete notification
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await notificationService.deleteNotification(req.params.id, req.user.id);
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
});

// Delete all notifications
router.delete('/', authenticate, async (req, res, next) => {
  try {
    await notificationService.deleteAllNotifications(req.user.id);
    res.json({ success: true, message: 'All notifications deleted' });
  } catch (error) {
    next(error);
  }
});

// Get unread count
router.get('/unread/count', authenticate, async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);
    res.json({ success: true, data: { unreadCount: count } });
  } catch (error) {
    next(error);
  }
});

// Delivery endpoints (OTP and webhooks)
router.post('/send-otp', deliveryController.sendOTP);
router.post('/verify-otp', deliveryController.verifyOTP);
// Payment gateway webhook to trigger ticket generation and notifications
router.post('/payment-webhook', deliveryController.paymentWebhook);

// Error handler middleware
function next(error) {
  if (error instanceof AppError) {
    res.status(error.statusCode || 500).json({ 
      success: false, 
      message: error.message,
      ...error.data
    });
  } else {
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message
    });
  }
}

module.exports = router;
