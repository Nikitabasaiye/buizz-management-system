const { getMySQLPool } = require('../database/mysql');
const { sendEmail, sendTicketPdfEmail } = require('../utils/email');
const whatsappService = require('./whatsapp.service');
const logger = require('../utils/logger');

const enqueue = async ({ type, recipient, payload, availableAt = null }) => {
  if (!recipient) return null;
  const pool = getMySQLPool();
  const [result] = await pool.execute(
    `INSERT INTO notification_queue
      (type, recipient, payload, available_at)
     VALUES (?, ?, ?, COALESCE(?, NOW()))`,
    [type, recipient, JSON.stringify(payload || {}), availableAt],
  );
  return result.insertId;
};

const enqueueTicketDelivery = async ({ phone, whatsappPayload, emailPayload }) => {
  const jobs = [];
  if (phone) {
    jobs.push(enqueue({
      type: 'WHATSAPP',
      recipient: phone,
      payload: { kind: 'ticket', data: whatsappPayload },
    }));
  }
  if (emailPayload?.to) {
    jobs.push(enqueue({
      type: 'EMAIL',
      recipient: emailPayload.to,
      payload: { kind: 'ticket', data: emailPayload },
    }));
  }
  return Promise.all(jobs);
};

const parsePayload = (value) => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return {}; }
};

const deliver = async (job) => {
  const payload = parsePayload(job.payload);
  if (job.type === 'EMAIL') {
    if (payload.kind === 'ticket') {
      const result = await sendTicketPdfEmail({ ...payload.data, to: job.recipient });
      if (result?.skipped) throw new Error(result.error || result.reason || 'Email was skipped');
      return result;
    }
    const result = await sendEmail({ ...payload.data, to: job.recipient });
    if (result?.skipped) throw new Error(result.error || result.reason || 'Email was skipped');
    return result;
  }
  if (job.type === 'WHATSAPP') {
    if (payload.kind === 'ticket') {
      return whatsappService.sendBookingConfirmation(job.recipient, payload.data);
    }
    if (payload.kind === 'otp') {
      return whatsappService.sendOtp(job.recipient, payload.data?.otp);
    }
    return whatsappService.sendTextMessage(job.recipient, payload.data?.message);
  }
  throw new Error(`Unsupported notification type: ${job.type}`);
};

const claimNext = async () => {
  const pool = getMySQLPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT *
       FROM notification_queue
       WHERE status IN ('PENDING', 'FAILED')
         AND retry_count < max_retries
         AND available_at <= NOW()
       ORDER BY id
       LIMIT 1
       FOR UPDATE`,
    );
    const job = rows[0];
    if (!job) {
      await connection.commit();
      return null;
    }
    await connection.execute(
      `UPDATE notification_queue
       SET status = 'PROCESSING', locked_at = NOW()
       WHERE id = ?`,
      [job.id],
    );
    await connection.commit();
    return job;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const processPending = async ({ limit = 50 } = {}) => {
  const pool = getMySQLPool();
  // Recover jobs left processing after a killed cron/process.
  await pool.query(
    `UPDATE notification_queue
     SET status = 'FAILED', locked_at = NULL,
         last_error = COALESCE(last_error, 'Worker interrupted')
     WHERE status = 'PROCESSING' AND locked_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE)`,
  );

  const summary = { processed: 0, sent: 0, failed: 0 };
  while (summary.processed < limit) {
    const job = await claimNext();
    if (!job) break;
    summary.processed += 1;
    try {
      await deliver(job);
      await pool.execute(
        `UPDATE notification_queue
         SET status = 'SENT', processed_at = NOW(), locked_at = NULL, last_error = NULL
         WHERE id = ?`,
        [job.id],
      );
      summary.sent += 1;
    } catch (error) {
      const nextRetry = Number(job.retry_count || 0) + 1;
      const delayMinutes = Math.min(60, 2 ** nextRetry);
      await pool.execute(
        `UPDATE notification_queue
         SET status = 'FAILED', retry_count = ?, locked_at = NULL,
             last_error = ?, available_at = DATE_ADD(NOW(), INTERVAL ? MINUTE)
         WHERE id = ?`,
        [nextRetry, String(error.message || error).slice(0, 2000), delayMinutes, job.id],
      );
      summary.failed += 1;
      logger.warn('Queued notification delivery failed', {
        queueId: job.id,
        retryCount: nextRetry,
        error: error.message,
      });
    }
  }
  return summary;
};

module.exports = {
  enqueue,
  enqueueTicketDelivery,
  processPending,
};
