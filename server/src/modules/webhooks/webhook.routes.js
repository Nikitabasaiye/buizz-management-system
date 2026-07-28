const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');
const razorpayService = require('../../services/razorpay.service');
const paymentRepository = require('../../repositories/payment.repository');
const paymentHistoryRepository = require('../../repositories/paymentHistory.repository');
const settlementService = require('../settlements/settlement.service');
const bookingService = require('../bookings/booking.service');
const auditService = require('../../services/audit.service');
const { getMySQLPool } = require('../../database/mysql');

const router = express.Router();

// Meta Webhook Configuration
const WEBHOOK_VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'buizz_webhook_token_2024';
const APP_SECRET = process.env.META_APP_SECRET;

// In-memory rate limiting for webhooks
const webhookRateLimit = new Map();
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX_REQUESTS = 100;

// Idempotency tracking (prevent duplicate processing)
const processedWebhooks = new Set();
const IDEMPOTENCY_WINDOW = 300000;

const rateLimitMiddleware = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  for (const [key, value] of webhookRateLimit.entries()) {
    if (now - value.timestamp > RATE_LIMIT_WINDOW) webhookRateLimit.delete(key);
  }

  const key = `${ip}:${Math.floor(now / RATE_LIMIT_WINDOW)}`;
  const current = webhookRateLimit.get(key) || { count: 0, timestamp: now };

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    logger.warn('Webhook rate limit exceeded', { ip });
    return res.status(429).json({ error: 'Too many requests', retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000) });
  }

  current.count++;
  webhookRateLimit.set(key, current);
  res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS);
  res.setHeader('X-RateLimit-Remaining', RATE_LIMIT_MAX_REQUESTS - current.count);
  res.setHeader('X-RateLimit-Reset', current.timestamp + RATE_LIMIT_WINDOW);
  next();
};

const cleanIdempotencyEntries = () => {
  const now = Date.now();
  for (const entry of processedWebhooks) {
    const parts = entry.split(':');
    const timestamp = parseInt(parts[parts.length - 1]);
    if (now - timestamp > IDEMPOTENCY_WINDOW) processedWebhooks.delete(entry);
  }
};

// ── WhatsApp Webhook ──────────────────────────────────────────────────────────
router.get('/whatsapp', (req, res) => {
  const requestId = uuidv4();
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  logger.info('Webhook verification attempt', { requestId, mode, ip: req.ip });

  if (mode === 'subscribe' && token) {
    // Timing-safe comparison for webhook verify token
    const tokenBuf = Buffer.from(token);
    const expectedBuf = Buffer.from(WEBHOOK_VERIFY_TOKEN);
    const isValid =
      tokenBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(tokenBuf, expectedBuf);

    if (isValid) {
      logger.info('WhatsApp webhook verified', { requestId });
      return res.status(200).set('X-Request-ID', requestId).send(challenge);
    }
  }

  if (!mode && !token) {
    return res.status(200).json({ status: 'Webhook endpoint is active', requestId });
  }

  logger.warn('WhatsApp webhook verification failed', { requestId });
  return res.status(403).set('X-Request-ID', requestId).json({ error: 'Forbidden', requestId });
});

router.post('/whatsapp', rateLimitMiddleware, async (req, res) => {
  const requestId = uuidv4();
  const startTime = Date.now();
  cleanIdempotencyEntries();

  try {
    const body = req.body;
    const signature = req.headers['x-hub-signature-256'];

    if (APP_SECRET) {
      if (!signature) {
        logger.warn('WhatsApp webhook signature missing', { requestId });
        return res.status(403).set('X-Request-ID', requestId).json({ error: 'Signature missing', requestId });
      }

      const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', APP_SECRET)
        .update(JSON.stringify(body))
        .digest('hex');

      const expectedBuf = Buffer.from(expectedSignature);
      const receivedBuf = Buffer.from(signature);
      const isValid =
        expectedBuf.length === receivedBuf.length &&
        crypto.timingSafeEqual(expectedBuf, receivedBuf);

      if (!isValid) {
        logger.warn('WhatsApp webhook signature verification failed', { requestId });
        return res.status(403).set('X-Request-ID', requestId).json({ error: 'Invalid signature', requestId });
      }
    }

    if (!body.object) {
      return res.status(400).set('X-Request-ID', requestId).json({ error: 'Invalid payload', requestId });
    }

    if (body.object === 'whatsapp_business_account') {
      const processingPromises = (body.entry || []).map(async (entry) => {
        for (const change of (entry.changes || [])) {
          const idempotencyKey = `${entry.id}:${change.field}:${Date.now()}`;
          if (processedWebhooks.has(idempotencyKey)) continue;
          processedWebhooks.add(idempotencyKey);

          switch (change.field) {
            case 'messages':
              await handleMessagesWebhook(change.value, requestId);
              break;
            default:
              logger.info('Unhandled WhatsApp webhook field', { requestId, field: change.field });
          }
        }
      });
      await Promise.all(processingPromises);
    }

    const processingTime = Date.now() - startTime;
    return res.status(200).set('X-Request-ID', requestId).json({ status: 'ok', requestId, processingTime });
  } catch (error) {
    logger.error('WhatsApp webhook processing error', { requestId, error: error.message });
    return res.status(200).set('X-Request-ID', requestId).json({ status: 'error', error: error.message, requestId });
  }
});

async function handleMessagesWebhook(value, requestId) {
  try {
    const messages = value.messages || [];
    const statuses = value.statuses || [];

    for (const message of messages) {
      logger.info('Incoming WhatsApp message', {
        requestId,
        from: message.from,
        messageId: message.id,
        type: message.type,
      });
    }

    for (const status of statuses) {
      logger.info('WhatsApp message status update', {
        requestId,
        messageId: status.id,
        status: status.status,
        recipientId: status.recipient_id,
      });
    }
  } catch (error) {
    logger.error('Error handling WhatsApp messages webhook', { requestId, error: error.message });
  }
}

// ── Razorpay Webhook ──────────────────────────────────────────────────────────
// IMPORTANT: This route uses express.raw() middleware (applied in app.js before this router)
// so req.body is a raw Buffer — required for correct HMAC signature verification.
// URL registered in Razorpay dashboard: https://api.buizz.com/api/v1/webhooks/razorpay
router.post('/razorpay', async (req, res) => {
  const requestId = uuidv4();
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.body; // Buffer from express.raw()

    if (!razorpayService.verifyWebhookSignature(rawBody, signature)) {
      logger.warn('Razorpay webhook: invalid signature', { requestId });
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    // Parse body after signature verification
    const payload = JSON.parse(rawBody.toString('utf8'));
    const event = payload.event;
    const entityPayload = payload.payload;

    logger.info('Razorpay webhook received', { event, requestId });

    // Idempotency: skip if already processed
    const idempotencyKey = `razorpay:${event}:${entityPayload?.payment?.entity?.id || entityPayload?.refund?.entity?.id || requestId}`;
    if (processedWebhooks.has(idempotencyKey)) {
      logger.info('Razorpay webhook duplicate skipped', { requestId, idempotencyKey });
      return res.status(200).json({ success: true });
    }
    processedWebhooks.add(`${idempotencyKey}:${Date.now()}`);

    const pool = getMySQLPool();

    if (event === 'payment.captured') {
      const rzpPayment = entityPayload?.payment?.entity;
      if (!rzpPayment) return res.status(200).json({ success: true });

      // Find payment by dedicated razorpay_order_id column first, then fallback
      let dbPayment = await paymentRepository.findByRazorpayOrderId(rzpPayment.order_id);

      if (!dbPayment) {
        logger.warn('Razorpay webhook: payment record not found', {
          requestId,
          razorpayOrderId: rzpPayment.order_id,
        });
        return res.status(200).json({ success: true });
      }

      if (dbPayment.status === 'completed') {
        return res.status(200).json({ success: true });
      }

      await paymentRepository.updateStatus(
        dbPayment.order_id,
        {
          status: 'completed',
          transaction_id: rzpPayment.id,
          payment_method: `razorpay_${rzpPayment.method || 'card'}`,
          metadata: {
            razorpayPaymentId: rzpPayment.id,
            razorpayOrderId: rzpPayment.order_id,
            method: rzpPayment.method,
            webhookEvent: event,
            webhookReceived: new Date().toISOString(),
          },
        },
        { source: 'webhook' }
      );

      await pool.execute(
        'UPDATE bookings SET booking_status = ?, payment_status = ? WHERE booking_id = ?',
        ['confirmed', 'completed', dbPayment.booking_id]
      );

      await settlementService.recordCompletedPayment(dbPayment.order_id).catch((err) =>
        logger.error('Settlement failed after Razorpay webhook', { error: err.message })
      );

      const updatedPayment = await paymentRepository.findByOrderId(dbPayment.order_id);
      await bookingService.createTicketsAndEnqueueJobs(updatedPayment).catch((err) =>
        logger.error('Ticket creation failed after Razorpay webhook', { error: err.message })
      );

      // Audit log
      await auditService.logAction({
        action: 'razorpay_payment_captured',
        actionType: 'payment',
        resourceType: 'payment',
        resourceId: dbPayment.payment_id,
        userId: dbPayment.user_id,
        description: `Razorpay payment captured via webhook: ${rzpPayment.id}`,
        metadata: { razorpayPaymentId: rzpPayment.id, razorpayOrderId: rzpPayment.order_id, orderId: dbPayment.order_id },
        severity: 'low',
      }).catch(() => {});

      logger.info('Razorpay webhook: booking confirmed', {
        requestId,
        orderId: dbPayment.order_id,
        razorpayPaymentId: rzpPayment.id,
      });
    }

    if (event === 'payment.failed') {
      const rzpPayment = entityPayload?.payment?.entity;
      if (!rzpPayment) return res.status(200).json({ success: true });

      const dbPayment = await paymentRepository.findByRazorpayOrderId(rzpPayment.order_id);

      if (dbPayment && dbPayment.status !== 'completed') {
        await paymentRepository.updateStatus(
          dbPayment.order_id,
          {
            status: 'failed',
            transaction_id: rzpPayment.id || null,
            payment_method: 'razorpay',
            metadata: {
              razorpayPaymentId: rzpPayment.id,
              razorpayOrderId: rzpPayment.order_id,
              errorCode: rzpPayment.error_code,
              errorDescription: rzpPayment.error_description,
            },
          },
          { source: 'webhook' }
        );

        await pool.execute(
          'UPDATE bookings SET booking_status = ?, payment_status = ? WHERE booking_id = ?',
          ['cancelled', 'failed', dbPayment.booking_id]
        );

        await auditService.logAction({
          action: 'razorpay_payment_failed',
          actionType: 'payment',
          resourceType: 'payment',
          resourceId: dbPayment.payment_id,
          userId: dbPayment.user_id,
          description: `Razorpay payment failed via webhook: ${rzpPayment.error_description}`,
          metadata: { razorpayOrderId: rzpPayment.order_id, errorCode: rzpPayment.error_code },
          severity: 'medium',
        }).catch(() => {});

        logger.info('Razorpay webhook: payment failed recorded', { requestId, orderId: dbPayment.order_id });
      }
    }

    if (event === 'refund.processed') {
      const rzpRefund = entityPayload?.refund?.entity;
      if (rzpRefund) {
        const dbPayment = await paymentRepository.findByRazorpayOrderId(rzpRefund.payment_id).catch(() => null);

        await paymentHistoryRepository.record({
          paymentId: dbPayment?.payment_id,
          orderId: dbPayment?.order_id,
          userId: dbPayment?.user_id,
          gateway: 'razorpay',
          gatewayPaymentId: rzpRefund.payment_id,
          fromStatus: 'completed',
          toStatus: 'refunded',
          amount: rzpRefund.amount / 100,
          currency: rzpRefund.currency || 'INR',
          source: 'webhook',
          rawPayload: rzpRefund,
        }).catch(() => {});

        logger.info('Razorpay refund processed', {
          requestId,
          refundId: rzpRefund.id,
          paymentId: rzpRefund.payment_id,
        });
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Razorpay webhook processing error', { requestId, error: error.message });
    return res.status(200).json({ success: true }); // always ack to prevent retries
  }
});

module.exports = router;
