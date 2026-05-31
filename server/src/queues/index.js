const { Queue, Worker } = require('bullmq');
const { QUEUE_NAMES } = require('../constants');
const logger = require('../utils/logger');

const connection = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD || undefined
};

// Queue instances
const emailQueue = new Queue(QUEUE_NAMES.EMAIL, { connection });
const whatsappQueue = new Queue(QUEUE_NAMES.WHATSAPP, { connection });
const ticketQueue = new Queue(QUEUE_NAMES.TICKET, { connection });
const analyticsQueue = new Queue(QUEUE_NAMES.ANALYTICS, { connection });
const notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATION, { connection });

// Workers
const emailWorker = new Worker(QUEUE_NAMES.EMAIL, async (job) => {
  logger.info(`Processing email job: ${job.id}`);
  // Email sending logic here
  const { to, subject, body } = job.data;
  // await sendEmail(to, subject, body);
}, { connection });

const whatsappWorker = new Worker(QUEUE_NAMES.WHATSAPP, async (job) => {
  logger.info(`Processing WhatsApp job: ${job.id}`);
  // WhatsApp sending logic here
}, { connection });

const ticketWorker = new Worker(QUEUE_NAMES.TICKET, async (job) => {
  logger.info(`Processing ticket job: ${job.id}`);
  // Ticket generation logic here
}, { connection });

const analyticsWorker = new Worker(QUEUE_NAMES.ANALYTICS, async (job) => {
  logger.info(`Processing analytics job: ${job.id}`);
  // Analytics processing logic here
}, { connection });

const notificationWorker = new Worker(QUEUE_NAMES.NOTIFICATION, async (job) => {
  logger.info(`Processing notification job: ${job.id}`);
  // Notification logic here
}, { connection });

// Error handlers
[emailWorker, whatsappWorker, ticketWorker, analyticsWorker, notificationWorker].forEach(worker => {
  worker.on('failed', (job, err) => {
    logger.error(`Job ${job.id} failed:`, err);
  });
});

const initializeQueues = async () => {
  logger.info('All queues initialized');
};

module.exports = {
  initializeQueues,
  emailQueue,
  whatsappQueue,
  ticketQueue,
  analyticsQueue,
  notificationQueue
};
