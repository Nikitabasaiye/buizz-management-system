const { Queue } = require('bullmq');
const { QUEUE_NAMES } = require('../constants');
const logger = require('../utils/logger');
const { createRedisConnection } = require('./redis-connection');

const defaultJobOptions = {
  attempts: Number(process.env.QUEUE_ATTEMPTS || 5),
  backoff: {
    type: 'exponential',
    delay: Number(process.env.QUEUE_BACKOFF_MS || 5000),
  },
  removeOnComplete: {
    count: Number(process.env.QUEUE_COMPLETED_RETENTION_COUNT || 1000),
    age: Number(process.env.QUEUE_COMPLETED_RETENTION_SECONDS || 86400),
  },
  removeOnFail: {
    count: Number(process.env.QUEUE_FAILED_RETENTION_COUNT || 5000),
    age: Number(process.env.QUEUE_FAILED_RETENTION_SECONDS || 1209600),
  },
};

const redisDisabled = process.env.REDIS_DISABLED === 'true'
  || process.env.DISABLE_REDIS === 'true'
  || process.env.QUEUE_PROVIDER === 'disabled';

class DisabledQueue {
  constructor(name) {
    this.name = name;
  }

  async add() {
    throw new Error(`Queue "${this.name}" is unavailable because Redis/Valkey is disabled`);
  }

  async getJobCounts() {
    return { disabled: 1 };
  }

  async close() {}
}

const producerConnection = redisDisabled ? null : createRedisConnection('producer');
const createQueue = (name) => redisDisabled
  ? new DisabledQueue(name)
  : new Queue(name, {
    connection: producerConnection,
    defaultJobOptions,
    prefix: process.env.BULLMQ_PREFIX || 'buizz',
  });

const bookingConfirmedQueue = createQueue(QUEUE_NAMES.BOOKING_CONFIRMED);
const whatsappQueue = createQueue(QUEUE_NAMES.WHATSAPP);
const pdfQueue = createQueue(QUEUE_NAMES.PDF_GENERATION);
const emailQueue = createQueue(QUEUE_NAMES.EMAIL);
const notificationQueue = createQueue(QUEUE_NAMES.NOTIFICATION);

let workers = [];

const initializeWorkers = async () => {
  if (redisDisabled) {
    throw new Error('The worker process requires Redis/Valkey; set REDIS_DISABLED=false');
  }
  if (workers.length) return workers;

  const { createBookingConfirmedWorker } = require('./workers/bookingConfirmed.worker');
  const { createWhatsAppWorker } = require('./workers/whatsapp.worker');
  const { createPdfWorker } = require('./workers/pdf.worker');
  const { createEmailWorker } = require('./workers/email.worker');
  const { createNotificationWorker } = require('./workers/notification.worker');

  workers = [
    createBookingConfirmedWorker(createRedisConnection('booking-worker')),
    createWhatsAppWorker(createRedisConnection('whatsapp-worker')),
    createPdfWorker(createRedisConnection('pdf-worker')),
    createEmailWorker(createRedisConnection('email-worker')),
    createNotificationWorker(createRedisConnection('notification-worker')),
  ];

  await Promise.all(workers.map((worker) => worker.waitUntilReady()));
  logger.info('BullMQ workers are ready', { count: workers.length });
  return workers;
};

const initializeQueues = initializeWorkers;

const getQueueHealth = async () => {
  const queueEntries = {
    bookingConfirmed: bookingConfirmedQueue,
    whatsapp: whatsappQueue,
    pdf: pdfQueue,
    email: emailQueue,
    notification: notificationQueue,
  };

  const result = {};
  for (const [name, queue] of Object.entries(queueEntries)) {
    result[name] = await queue.getJobCounts(
      'wait',
      'active',
      'delayed',
      'completed',
      'failed',
      'paused',
    );
  }
  return result;
};

const shutdownQueues = async () => {
  await Promise.allSettled(workers.map((worker) => worker.close()));
  workers = [];
  await Promise.allSettled([
    bookingConfirmedQueue.close(),
    whatsappQueue.close(),
    pdfQueue.close(),
    emailQueue.close(),
    notificationQueue.close(),
  ]);
  if (producerConnection) {
    await producerConnection.quit().catch(() => producerConnection.disconnect());
  }
};

module.exports = {
  initializeQueues,
  initializeWorkers,
  shutdownQueues,
  getQueueHealth,
  producerConnection,
  bookingConfirmedQueue,
  whatsappQueue,
  pdfQueue,
  emailQueue,
  notificationQueue,
};
