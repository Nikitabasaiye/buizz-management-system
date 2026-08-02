const { Worker } = require('bullmq');
const { QUEUE_NAMES } = require('../../constants');
const { sendEmail, sendTicketPdfEmail } = require('../../utils/email');
const whatsappService = require('../../services/whatsapp.service');
const logger = require('../../utils/logger');

const processNotification = async (job) => {
  const { type, recipient, payload = {} } = job.data || {};

  if (type === 'EMAIL') {
    const result = payload.kind === 'ticket'
      ? await sendTicketPdfEmail({ ...payload.data, to: recipient })
      : await sendEmail({ ...payload.data, to: recipient });
    if (result?.skipped) throw new Error(result.error || result.reason || 'Email skipped');
    return result;
  }

  if (type === 'WHATSAPP') {
    if (payload.kind === 'ticket') {
      return whatsappService.sendBookingConfirmation(recipient, payload.data);
    }
    if (payload.kind === 'otp') {
      return whatsappService.sendOtp(recipient, payload.data?.otp);
    }
    return whatsappService.sendTextMessage(recipient, payload.data?.message);
  }

  throw new Error(`Unsupported notification type: ${type}`);
};

const createNotificationWorker = (connection) => {
  const worker = new Worker(QUEUE_NAMES.NOTIFICATION, processNotification, {
    connection,
    prefix: process.env.BULLMQ_PREFIX || 'buizz',
    concurrency: Number(process.env.NOTIFICATION_WORKER_CONCURRENCY || 5),
  });
  worker.on('failed', (job, error) => logger.error('Notification job failed', {
    jobId: job?.id,
    error: error.message,
  }));
  return worker;
};

module.exports = { createNotificationWorker };
