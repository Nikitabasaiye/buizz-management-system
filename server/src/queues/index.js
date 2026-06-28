const { Queue } = require('bullmq');
const { QUEUE_NAMES } = require('../constants');
const logger = require('../utils/logger');

const { createBookingConfirmedWorker } = require('./workers/bookingConfirmed.worker');
const { createWhatsAppWorker } = require('./workers/whatsapp.worker');
const { createPdfWorker } = require('./workers/pdf.worker');

// ─── Redis connection config ──────────────────────────────────────────────────
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // required by BullMQ
};

// ─── Default job options ──────────────────────────────────────────────────────
const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: { count: 200, age: 24 * 3600 },
  removeOnFail: { count: 100, age: 7 * 24 * 3600 },
};

// ─── Queue instances ──────────────────────────────────────────────────────────
const bookingConfirmedQueue = new Queue(QUEUE_NAMES.BOOKING_CONFIRMED, {
  connection,
  defaultJobOptions,
});

const whatsappQueue = new Queue(QUEUE_NAMES.WHATSAPP, {
  connection,
  defaultJobOptions,
});

const pdfQueue = new Queue(QUEUE_NAMES.PDF_GENERATION, {
  connection,
  defaultJobOptions,
});

const emailQueue = new Queue(QUEUE_NAMES.EMAIL, {
  connection,
  defaultJobOptions,
});

const notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATION, {
  connection,
  defaultJobOptions,
});

// ─── Worker instances (created on init) ──────────────────────────────────────
let workers = [];

const initializeQueues = async () => {
  try {
    workers = [
      createBookingConfirmedWorker(connection),
      createWhatsAppWorker(connection),
      createPdfWorker(connection),
    ];

    logger.info('BullMQ queues and workers initialized', {
      queues: Object.values(QUEUE_NAMES),
      workers: workers.length,
    });
  } catch (error) {
    logger.error('Failed to initialize queues', { error: error.message });
    throw error;
  }
};

// ─── Graceful shutdown ────────────────────────────────────────────────────────
const shutdownQueues = async () => {
  logger.info('Shutting down BullMQ workers...');
  await Promise.all(workers.map((w) => w.close()));
  await Promise.all([
    bookingConfirmedQueue.close(),
    whatsappQueue.close(),
    pdfQueue.close(),
    emailQueue.close(),
    notificationQueue.close(),
  ]);
  logger.info('All BullMQ queues and workers closed');
};

module.exports = {
  initializeQueues,
  shutdownQueues,
  bookingConfirmedQueue,
  whatsappQueue,
  pdfQueue,
  emailQueue,
  notificationQueue,
};
