const crypto = require('crypto');
const { notificationQueue } = require('../queues');

const stableJobId = ({ type, recipient, payload }) => crypto
  .createHash('sha256')
  .update(JSON.stringify({ type, recipient, payload }))
  .digest('hex');

const enqueue = async ({ type, recipient, payload, availableAt = null }) => {
  if (!recipient) return null;
  const delay = availableAt
    ? Math.max(0, new Date(availableAt).getTime() - Date.now())
    : 0;
  const data = { type, recipient, payload: payload || {} };
  const job = await notificationQueue.add(
    String(type || 'notification').toLowerCase(),
    data,
    { jobId: stableJobId(data), delay },
  );
  return job.id;
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

const processPending = async () => ({
  processed: 0,
  sent: 0,
  failed: 0,
  message: 'MySQL notification processing is retired; BullMQ workers run continuously.',
});

module.exports = { enqueue, enqueueTicketDelivery, processPending };
