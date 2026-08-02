const { Worker } = require('bullmq');
const { QUEUE_NAMES } = require('../../constants');
const { getMySQLPool } = require('../../database/mysql');
const { sendEmail } = require('../../utils/email');
const logger = require('../../utils/logger');

const resolveRecipient = async (data) => {
  if (data.to) return data.to;
  if (!data.recipientId) return null;
  const pool = getMySQLPool();
  const [rows] = await pool.query(
    'SELECT email FROM users WHERE user_id = ? LIMIT 1',
    [data.recipientId],
  );
  return rows[0]?.email || null;
};

const processEmail = async (job) => {
  const data = job.data || {};
  const to = await resolveRecipient(data);
  if (!to) throw new Error(`Email recipient is missing for job ${job.id}`);

  const subject = data.subject || 'Buizz notification';
  const text = data.text || [
    data.eventName && `Event: ${data.eventName}`,
    data.staffName && `Staff: ${data.staffName}`,
    data.organizerName && `Organizer: ${data.organizerName}`,
    data.rejectionReason && `Reason: ${data.rejectionReason}`,
    data.ticketId && `Support ticket: ${data.ticketId}`,
  ].filter(Boolean).join('\n') || 'You have a new Buizz notification.';

  const result = await sendEmail({ to, subject, text, html: data.html });
  if (result?.skipped) {
    throw new Error(result.error || result.reason || 'Email delivery was skipped');
  }
  return { messageId: result.messageId, to };
};

const createEmailWorker = (connection) => {
  const worker = new Worker(QUEUE_NAMES.EMAIL, processEmail, {
    connection,
    prefix: process.env.BULLMQ_PREFIX || 'buizz',
    concurrency: Number(process.env.EMAIL_WORKER_CONCURRENCY || 5),
    limiter: {
      max: Number(process.env.EMAIL_RATE_LIMIT_MAX || 10),
      duration: Number(process.env.EMAIL_RATE_LIMIT_DURATION_MS || 1000),
    },
  });
  worker.on('failed', (job, error) => logger.error('Email job failed', {
    jobId: job?.id,
    error: error.message,
  }));
  return worker;
};

module.exports = { createEmailWorker };
