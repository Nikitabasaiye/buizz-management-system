const { Worker } = require('bullmq');
const whatsappService = require('../../services/whatsapp.service');
const { QUEUE_NAMES } = require('../../constants');
const logger = require('../../utils/logger');

const JOB_TYPES = {
  BOOKING_CONFIRMATION: 'booking_confirmation',
  EVENT_REMINDER: 'event_reminder',
  TICKET_DETAILS: 'ticket_details',
  TEXT_MESSAGE: 'text_message',
};

const processJob = async (job) => {
  const { type, data } = job.data;

  logger.info(`[WhatsApp Worker] Processing job ${job.id} | type: ${type}`);

  switch (type) {
    case JOB_TYPES.BOOKING_CONFIRMATION: {
      const { phoneNumber, bookingDetails } = data;

      if (!whatsappService.isConfigured()) {
        logger.warn('[WhatsApp Worker] Service not configured, skipping job', { jobId: job.id });
        return { skipped: true, reason: 'not_configured' };
      }

      if (!phoneNumber) {
        logger.warn('[WhatsApp Worker] No phone number, skipping job', { jobId: job.id });
        return { skipped: true, reason: 'no_phone' };
      }

      const result = await whatsappService.sendBookingConfirmation(phoneNumber, bookingDetails);
      logger.info('[WhatsApp Worker] Booking confirmation sent', {
        jobId: job.id,
        orderId: bookingDetails.orderId,
        messageId: result.messageId,
      });
      return result;
    }

    case JOB_TYPES.TEXT_MESSAGE: {
      const { phoneNumber, message } = data;
      const result = await whatsappService.sendTextMessage(phoneNumber, message);
      logger.info('[WhatsApp Worker] Text message sent', { jobId: job.id });
      return result;
    }

    case JOB_TYPES.EVENT_REMINDER: {
      const { phoneNumber, reminderDetails } = data;
      const result = await whatsappService.sendEventReminder(phoneNumber, reminderDetails);
      logger.info('[WhatsApp Worker] Event reminder sent', { jobId: job.id });
      return result;
    }

    case JOB_TYPES.TICKET_DETAILS: {
      const { phoneNumber, ticket } = data;
      const result = await whatsappService.sendTicketDetails(phoneNumber, ticket);
      logger.info('[WhatsApp Worker] Ticket details sent', { jobId: job.id });
      return result;
    }

    default:
      logger.warn(`[WhatsApp Worker] Unknown job type: ${type}`, { jobId: job.id });
      return { skipped: true, reason: 'unknown_type' };
  }
};

const createWhatsAppWorker = (connection) => {
  const worker = new Worker(QUEUE_NAMES.WHATSAPP, processJob, {
    connection,
    concurrency: 5,
    limiter: { max: 10, duration: 1000 }, // 10 messages/sec rate limit
  });

  worker.on('completed', (job, result) => {
    logger.info(`[WhatsApp Worker] Job ${job.id} completed`, { result });
  });

  worker.on('failed', (job, err) => {
    logger.error(`[WhatsApp Worker] Job ${job?.id} failed`, {
      error: err.message,
      attempts: job?.attemptsMade,
    });
  });

  worker.on('error', (err) => {
    logger.error('[WhatsApp Worker] Worker error', { error: err.message });
  });

  return worker;
};

module.exports = { createWhatsAppWorker, JOB_TYPES };
