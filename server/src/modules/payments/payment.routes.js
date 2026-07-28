const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticate } = require('../../middleware/auth');
const paymentController = require('./payment.controller');
const razorpayService = require('../../services/razorpay.service');
const paymentRepository = require('../../repositories/payment.repository');
const paymentHistoryRepository = require('../../repositories/paymentHistory.repository');
const bookingService = require('../bookings/booking.service');
const settlementService = require('../settlements/settlement.service');
const auditService = require('../../services/audit.service');
const { getMySQLPool } = require('../../database/mysql');
const logger = require('../../utils/logger');

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// ── Public webhooks (no auth) ─────────────────────────────────────────────────
// PhonePe webhook
router.post('/phonepe/webhook', paymentController.handleWebhook);

// ── Authenticated routes ──────────────────────────────────────────────────────
router.use(authenticate);

// Test config — protected, admin/super_admin only in production
router.get('/test-config', (req, res) => {
  const { PHONEPE_CONFIG } = require('../../config/phonepe');
  res.json({
    success: true,
    config: {
      phonepe: {
        clientId: PHONEPE_CONFIG.clientId ? PHONEPE_CONFIG.clientId.slice(0, 6) + '...' : '(not set)',
        isConfigured: !!(PHONEPE_CONFIG.clientId && PHONEPE_CONFIG.clientSecret && PHONEPE_CONFIG.clientVersion),
        env: String(PHONEPE_CONFIG.env),
      },
      razorpay: {
        keyId: process.env.RAZORPAY_KEY_ID ? process.env.RAZORPAY_KEY_ID.slice(0, 8) + '...' : '(not set)',
        isConfigured: razorpayService.isConfigured(),
        webhookUrl: 'https://api.buizz.com/api/v1/webhooks/razorpay',
      },
    },
  });
});

router.post(
  '/create',
  [
    body('eventId').isInt().withMessage('Event ID is required'),
    body('amount').isFloat({ min: 1 }).withMessage('Valid amount is required'),
    body('tickets').optional().isArray(),
    validate,
  ],
  paymentController.createPayment
);

router.get(
  '/verify/:orderId',
  [param('orderId').notEmpty().withMessage('Order ID is required'), validate],
  paymentController.verifyPayment
);

// ── Razorpay: verify payment after client-side popup completes ────────────────
router.post(
  '/razorpay/verify',
  [
    body('orderId').notEmpty().withMessage('Order ID is required'),
    body('razorpayOrderId').notEmpty().withMessage('Razorpay order ID is required'),
    body('razorpayPaymentId').notEmpty().withMessage('Razorpay payment ID is required'),
    body('razorpaySignature').notEmpty().withMessage('Razorpay signature is required'),
    validate,
  ],
  async (req, res, next) => {
    try {
      const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.get('user-agent');

      const dbPayment = await paymentRepository.findByOrderId(orderId);
      if (!dbPayment) {
        return res.status(404).json({ success: false, message: 'Payment not found' });
      }
      if (String(dbPayment.user_id) !== String(req.user.id)) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
      if (dbPayment.status === 'completed') {
        return res.status(200).json({
          success: true,
          message: 'Already completed',
          data: { status: 'COMPLETED' },
        });
      }

      const result = await razorpayService.verifyPayment({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      });

      if (result.success && result.status === 'COMPLETED') {
        const pool = getMySQLPool();

        await paymentRepository.updateStatus(
          orderId,
          {
            status: 'completed',
            transaction_id: razorpayPaymentId,
            payment_method: `razorpay_${result.paymentMethod || 'card'}`,
            metadata: {
              razorpayPaymentId,
              razorpayOrderId,
              method: result.paymentMethod,
            },
          },
          { source: 'verify_api', ipAddress, userAgent }
        );

        await pool.execute(
          'UPDATE bookings SET booking_status = ?, payment_status = ? WHERE booking_id = ?',
          ['confirmed', 'completed', dbPayment.booking_id]
        );

        await settlementService.recordCompletedPayment(orderId).catch((err) =>
          logger.error('Settlement failed after Razorpay verify', { error: err.message })
        );

        const updatedPayment = await paymentRepository.findByOrderId(orderId);
        const bookingConfirmation = await bookingService
          .createTicketsAndEnqueueJobs(updatedPayment)
          .catch((err) => {
            logger.error('Ticket creation failed after Razorpay verify', { error: err.message });
            return null;
          });

        // Audit log
        await auditService.logAction({
          userId: req.user.id,
          userName: req.user.name,
          userEmail: req.user.email,
          userRole: req.user.role,
          action: 'razorpay_payment_verified',
          actionType: 'payment',
          resourceType: 'payment',
          resourceId: dbPayment.payment_id,
          description: `Razorpay payment verified: ${razorpayPaymentId}`,
          ipAddress,
          userAgent,
          metadata: { razorpayPaymentId, razorpayOrderId, orderId },
          severity: 'low',
        }).catch(() => {});

        return res.status(200).json({
          success: true,
          message: 'Payment verified successfully',
          data: { status: 'COMPLETED', transactionId: razorpayPaymentId, bookingConfirmation },
        });
      }

      // Signature invalid or payment not captured
      await paymentRepository.updateStatus(
        orderId,
        {
          status: 'failed',
          transaction_id: razorpayPaymentId,
          payment_method: 'razorpay',
          metadata: { razorpayPaymentId, razorpayOrderId, reason: result.message },
        },
        { source: 'verify_api', ipAddress, userAgent }
      );

      await auditService.logAction({
        userId: req.user.id,
        action: 'razorpay_payment_verification_failed',
        actionType: 'payment',
        resourceType: 'payment',
        resourceId: dbPayment.payment_id,
        description: `Razorpay payment verification failed: ${result.message}`,
        ipAddress,
        metadata: { razorpayPaymentId, razorpayOrderId, reason: result.message },
        severity: 'high',
      }).catch(() => {});

      return res.status(400).json({
        success: false,
        message: result.message || 'Payment verification failed',
      });
    } catch (error) {
      logger.error('Razorpay verify endpoint error', { error: error.message });
      next(error);
    }
  }
);

router.get(
  '/status/:orderId',
  [param('orderId').notEmpty().withMessage('Order ID is required'), validate],
  paymentController.getPaymentStatus
);

// Full immutable payment history for an order
router.get(
  '/history/:orderId',
  [param('orderId').notEmpty().withMessage('Order ID is required'), validate],
  async (req, res, next) => {
    try {
      const { orderId } = req.params;
      const payment = await paymentRepository.findByOrderId(orderId);
      if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
      if (String(payment.user_id) !== String(req.user.id) &&
          !['admin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
      const history = await paymentHistoryRepository.findByOrderId(orderId);
      res.status(200).json({ success: true, data: history });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/refund',
  [
    body('orderId').notEmpty().withMessage('Order ID is required'),
    body('amount').optional().isFloat({ min: 1 }),
    body('reason').optional().isString(),
    validate,
  ],
  paymentController.initiateRefund
);

// Admin/Super Admin endpoint to get all payments
router.get(
  '/all',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    validate,
  ],
  paymentController.getAllPayments
);

module.exports = router;
