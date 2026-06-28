const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');

const router = express.Router();

// Meta Webhook Configuration
const WEBHOOK_VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'buizz_webhook_token_2024';
const APP_SECRET = process.env.META_APP_SECRET;

// Rate limiting for webhooks (prevent abuse)
const webhookRateLimit = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100;

// Idempotency tracking (prevent duplicate processing)
const processedWebhooks = new Set();
const IDEMPOTENCY_WINDOW = 300000; // 5 minutes

/**
 * Rate limiting middleware for webhooks
 */
const rateLimitMiddleware = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  // Clean old entries
  for (const [key, value] of webhookRateLimit.entries()) {
    if (now - value.timestamp > RATE_LIMIT_WINDOW) {
      webhookRateLimit.delete(key);
    }
  }
  
  // Check rate limit
  const key = `${ip}:${Math.floor(now / RATE_LIMIT_WINDOW)}`;
  const current = webhookRateLimit.get(key) || { count: 0, timestamp: now };
  
  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    logger.warn('Admin Webhook rate limit exceeded', { ip });
    return res.status(429).json({ 
      error: 'Too many requests',
      retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000)
    });
  }
  
  current.count++;
  webhookRateLimit.set(key, current);
  
  // Add rate limit headers
  res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS);
  res.setHeader('X-RateLimit-Remaining', RATE_LIMIT_MAX_REQUESTS - current.count);
  res.setHeader('X-RateLimit-Reset', current.timestamp + RATE_LIMIT_WINDOW);
  
  next();
};

/**
 * Generate unique request ID for tracking
 */
const generateRequestId = () => {
  return uuidv4();
};

/**
 * Clean old idempotency entries
 */
const cleanIdempotencyEntries = () => {
  const now = Date.now();
  for (const entry of processedWebhooks) {
    const [id, timestamp] = entry.split(':');
    if (now - parseInt(timestamp) > IDEMPOTENCY_WINDOW) {
      processedWebhooks.delete(entry);
    }
  }
};

/**
 * GET /api/webhooks/whatsapp
 * Meta will send a GET request to verify the webhook
 * Query params: hub.mode, hub.challenge, hub.verify_token
 */
router.get('/whatsapp', (req, res) => {
  const requestId = generateRequestId();
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  logger.info('Admin Webhook verification attempt', { 
    requestId, 
    mode, 
    token: token ? 'present' : 'missing',
    ip: req.ip 
  });

  // Meta verification
  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    logger.info('Admin Webhook verified successfully', { requestId });
    return res.status(200)
      .set('X-Request-ID', requestId)
      .send(challenge);
  }

  // Simple health check for testing
  if (!mode && !token) {
    return res.status(200).json({
      status: 'Admin Webhook endpoint is active',
      verifyToken: WEBHOOK_VERIFY_TOKEN,
      message: 'Use Meta verification parameters for actual verification',
      requestId
    });
  }

  logger.warn('Admin Webhook verification failed', { 
    requestId, 
    mode, 
    tokenReceived: token, 
    tokenExpected: WEBHOOK_VERIFY_TOKEN 
  });
  
  return res.status(403)
    .set('X-Request-ID', requestId)
    .json({ 
      error: 'Forbidden', 
      message: 'Invalid verification parameters',
      requestId 
    });
});

/**
 * POST /api/webhooks/whatsapp
 * Meta will send POST requests with webhook events
 * Payload can be up to 3 MB according to Meta documentation
 */
router.post('/whatsapp', rateLimitMiddleware, async (req, res) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  // Clean old idempotency entries periodically
  cleanIdempotencyEntries();
  
  try {
    const body = req.body;
    const signature = req.headers['x-hub-signature-256'];
    
    logger.info('Admin Webhook POST received', { 
      requestId, 
      ip: req.ip,
      hasSignature: !!signature,
      bodySize: JSON.stringify(body).length
    });

    // Verify webhook signature if APP_SECRET is configured
    if (APP_SECRET) {
      if (!signature) {
        logger.warn('Admin Webhook signature missing', { requestId });
        return res.status(403)
          .set('X-Request-ID', requestId)
          .json({ 
            error: 'Signature missing',
            requestId
          });
      }

      const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', APP_SECRET)
        .update(JSON.stringify(body))
        .digest('hex');

      if (signature !== expectedSignature) {
        logger.warn('Admin Webhook signature verification failed', { 
          requestId,
          expected: expectedSignature.substring(0, 20) + '...',
          received: signature.substring(0, 20) + '...'
        });
        return res.status(403)
          .set('X-Request-ID', requestId)
          .json({ 
            error: 'Invalid signature',
            requestId
          });
      }
    }

    // Validate webhook object
    if (!body.object) {
      logger.warn('Invalid webhook payload - missing object', { requestId });
      return res.status(400)
        .set('X-Request-ID', requestId)
        .json({ 
          error: 'Invalid payload',
          message: 'Missing object field',
          requestId
        });
    }

    // Process the webhook event
    if (body.object === 'whatsapp_business_account') {
      logger.info('Admin WhatsApp webhook received', { 
        requestId, 
        entryCount: body.entry?.length 
      });

      // Process each entry (Meta can send multiple entries in one webhook)
      const processingPromises = body.entry?.map(async (entry) => {
        const changes = entry.changes || [];
        
        // Process each change in the entry
        for (const change of changes) {
          const field = change.field;
          const value = change.value;
          
          // Create idempotency key
          const idempotencyKey = `${entry.id}:${field}:${Date.now()}`;
          
          // Skip if already processed
          if (processedWebhooks.has(idempotencyKey)) {
            logger.info('Admin Duplicate webhook skipped', { requestId, idempotencyKey });
            continue;
          }
          
          processedWebhooks.add(idempotencyKey);
          
          logger.info('Admin Webhook field received', { 
            requestId, 
            field, 
            entryId: entry.id 
          });

          // Handle different webhook fields according to Meta documentation
          switch (field) {
            case 'messages':
              await handleMessagesWebhook(value, requestId);
              break;
            case 'message_template_status_update':
              await handleTemplateStatusUpdate(value, requestId);
              break;
            case 'message_template_quality_update':
              await handleTemplateQualityUpdate(value, requestId);
              break;
            case 'account_alerts':
              await handleAccountAlerts(value, requestId);
              break;
            case 'phone_number_name_update':
              await handlePhoneNumberNameUpdate(value, requestId);
              break;
            case 'phone_number_quality_update':
              await handlePhoneNumberQualityUpdate(value, requestId);
              break;
            case 'business_capability_update':
              await handleBusinessCapabilityUpdate(value, requestId);
              break;
            default:
              logger.info('Admin Unhandled webhook field', { requestId, field });
          }
        }
      }) || [];

      await Promise.all(processingPromises);
    }

    const processingTime = Date.now() - startTime;
    
    logger.info('Admin Webhook processed successfully', { 
      requestId, 
      processingTime 
    });

    // Always return 200 to acknowledge receipt (Meta retries on non-200)
    return res.status(200)
      .set('X-Request-ID', requestId)
      .set('X-Processing-Time', processingTime)
      .json({ 
        status: 'ok',
        requestId,
        processingTime
      });
      
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error('Admin Webhook processing error', { 
      requestId, 
      error: error.message, 
      stack: error.stack,
      processingTime
    });
    
    // Still return 200 to prevent Meta from retrying indefinitely
    return res.status(200)
      .set('X-Request-ID', requestId)
      .set('X-Processing-Time', processingTime)
      .json({ 
        status: 'error', 
        error: error.message,
        requestId,
        processingTime
      });
  }
});

/**
 * Handle messages webhook field
 * This includes both incoming messages and message status updates
 */
async function handleMessagesWebhook(value, requestId) {
  try {
    const metadata = value.metadata;
    const messages = value.messages || [];
    const statuses = value.statuses || [];

    // Handle incoming messages
    for (const message of messages) {
      const from = message.from;
      const messageId = message.id;
      const timestamp = message.timestamp;
      const type = message.type;
      const contacts = value.contacts || [];

      logger.info('Admin Incoming WhatsApp message', {
        requestId,
        phone: metadata?.display_phone_number,
        phoneNumberId: metadata?.phone_number_id,
        from,
        messageId,
        type,
        timestamp,
        contactName: contacts[0]?.profile?.name,
      });

      // Handle different message types according to Meta documentation
      switch (type) {
        case 'text':
          const textBody = message.text?.body;
          logger.info('Admin Text message received', { requestId, from, textBody });
          // TODO: Implement admin-specific chatbot logic here
          break;
        case 'interactive':
          const interactiveType = message.interactive?.type;
          logger.info('Admin Interactive message received', { requestId, from, interactiveType });
          // TODO: Handle button/list responses
          break;
        case 'image':
          const imageId = message.image?.id;
          logger.info('Admin Image message received', { requestId, from, imageId });
          // TODO: Handle image messages
          break;
        case 'document':
          const documentId = message.document?.id;
          logger.info('Admin Document message received', { requestId, from, documentId });
          // TODO: Handle document messages
          break;
        case 'audio':
          const audioId = message.audio?.id;
          logger.info('Admin Audio message received', { requestId, from, audioId });
          break;
        case 'video':
          const videoId = message.video?.id;
          logger.info('Admin Video message received', { requestId, from, videoId });
          break;
        case 'location':
          const location = message.location;
          logger.info('Admin Location message received', { requestId, from, location });
          break;
        case 'contacts':
          const contactsData = message.contacts;
          logger.info('Admin Contacts message received', { requestId, from, contactsData });
          break;
        case 'reaction':
          const reaction = message.reaction;
          logger.info('Admin Reaction message received', { requestId, from, reaction });
          break;
        case 'order':
          const order = message.order;
          logger.info('Admin Order message received', { requestId, from, order });
          break;
        default:
          logger.info('Admin Unknown message type', { requestId, from, type });
      }
    }

    // Handle message status updates (sent, delivered, read, failed)
    for (const status of statuses) {
      const messageId = status.id;
      const statusType = status.status;
      const timestamp = status.timestamp;
      const recipientId = status.recipient_id;
      const errors = status.errors;

      logger.info('Admin Message status update', {
        requestId,
        messageId,
        status: statusType,
        timestamp,
        recipientId,
        errors,
      });

      // TODO: Update message status in database if tracking is needed
    }
  } catch (error) {
    logger.error('Admin Error handling messages webhook', { requestId, error: error.message });
  }
}

/**
 * Handle message template status updates
 */
async function handleTemplateStatusUpdate(value, requestId) {
  try {
    logger.info('Admin Template status update received', {
      requestId,
      messageTemplateId: value.message_template_id,
      event: value.event,
      status: value.message_template_status,
    });
    // TODO: Update template status in database
  } catch (error) {
    logger.error('Admin Error handling template status update', { requestId, error: error.message });
  }
}

/**
 * Handle message template quality updates
 */
async function handleTemplateQualityUpdate(value, requestId) {
  try {
    logger.info('Admin Template quality update received', {
      requestId,
      messageTemplateId: value.message_template_id,
      qualityScore: value.quality_score,
      category: value.category,
    });
    // TODO: Update template quality in database
  } catch (error) {
    logger.error('Admin Error handling template quality update', { requestId, error: error.message });
  }
}

/**
 * Handle account alerts
 */
async function handleAccountAlerts(value, requestId) {
  try {
    logger.info('Admin Account alert received', {
      requestId,
      alertType: value.type,
      phoneNumberId: value.phone_number_id,
      alertDetails: value,
    });
    // TODO: Handle account alerts (messaging limits, business profile changes, etc.)
  } catch (error) {
    logger.error('Admin Error handling account alert', { requestId, error: error.message });
  }
}

/**
 * Handle phone number name updates
 */
async function handlePhoneNumberNameUpdate(value, requestId) {
  try {
    logger.info('Admin Phone number name update received', {
      requestId,
      phoneNumberId: value.phone_number_id,
      verificationStatus: value.verification_status,
      requestReason: value.request_reason,
    });
    // TODO: Handle phone number name verification updates
  } catch (error) {
    logger.error('Admin Error handling phone number name update', { requestId, error: error.message });
  }
}

/**
 * Handle phone number quality updates
 */
async function handlePhoneNumberQualityUpdate(value, requestId) {
  try {
    logger.info('Admin Phone number quality update received', {
      requestId,
      phoneNumberId: value.phone_number_id,
      qualityRating: value.quality_rating,
      previousQualityRating: value.previous_quality_rating,
    });
    // TODO: Handle phone number quality updates
  } catch (error) {
    logger.error('Admin Error handling phone number quality update', { requestId, error: error.message });
  }
}

/**
 * Handle business capability updates
 */
async function handleBusinessCapabilityUpdate(value, requestId) {
  try {
    logger.info('Admin Business capability update received', {
      requestId,
      capability: value.capability,
      status: value.status,
      whatsappBusinessAccountId: value.whatsapp_business_account_id,
    });
    // TODO: Handle business capability updates (messaging limits, etc.)
  } catch (error) {
    logger.error('Admin Error handling business capability update', { requestId, error: error.message });
  }
}

module.exports = router;
