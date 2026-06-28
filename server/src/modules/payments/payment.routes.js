const express = require('express');
const { authenticate } = require('../../middleware/auth');
const paymentController = require('./payment.controller');
const { body, param, validationResult } = require('express-validator');

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

// Webhook - no auth required
router.post('/phonepe/webhook', paymentController.handleWebhook);

// Test endpoint - check PhonePe config
router.get('/test-config', (req, res) => {
  const { PHONEPE_CONFIG } = require('../../config/phonepe');
  res.json({
    success: true,
    config: {
      hasMerchantId: !!PHONEPE_CONFIG.merchantId,
      hasSaltKey: !!PHONEPE_CONFIG.saltKey,
      hasSaltIndex: !!PHONEPE_CONFIG.saltIndex,
      hasClientId: !!PHONEPE_CONFIG.clientId,
      hasClientSecret: !!PHONEPE_CONFIG.clientSecret,
      hasClientVersion: !!PHONEPE_CONFIG.clientVersion,
      hasCallbackUsername: !!PHONEPE_CONFIG.callbackUsername,
      hasCallbackPassword: !!PHONEPE_CONFIG.callbackPassword,
      environment: PHONEPE_CONFIG.env,
      checkoutUrl: PHONEPE_CONFIG.checkoutUrl,
      apiUrl: PHONEPE_CONFIG.apiUrl,
      clientId: PHONEPE_CONFIG.clientId ? PHONEPE_CONFIG.clientId.substring(0, 5) + '***' : 'NOT SET'
    }
  });
});

router.use(authenticate);

router.post(
  '/create',
  [
    body('eventId').isInt().withMessage('Event ID is required'),
    body('amount').isFloat({ min: 1 }).withMessage('Valid amount is required'),
    body('tickets').optional().isArray(),
    validate
  ],
  paymentController.createPayment
);

router.get(
  '/verify/:orderId',
  [
    param('orderId').notEmpty().withMessage('Order ID is required'),
    validate
  ],
  paymentController.verifyPayment
);

router.get(
  '/status/:orderId',
  [
    param('orderId').notEmpty().withMessage('Order ID is required'),
    validate
  ],
  paymentController.getPaymentStatus
);

router.post(
  '/refund',
  [
    body('orderId').notEmpty().withMessage('Order ID is required'),
    body('amount').optional().isFloat({ min: 1 }),
    body('reason').optional().isString(),
    validate
  ],
  paymentController.initiateRefund
);

module.exports = router;
