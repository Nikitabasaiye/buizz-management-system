// ─── BullMQ / Redis queues disabled (no Redis available) ─────────────────────
// const { Queue } = require('bullmq');
// const { QUEUE_NAMES } = require('../constants');
// const { createBookingConfirmedWorker } = require('./workers/bookingConfirmed.worker');
// const { createWhatsAppWorker } = require('./workers/whatsapp.worker');
// const { createPdfWorker } = require('./workers/pdf.worker');

// const connection = {
//   host: process.env.REDIS_HOST || 'localhost',
//   port: parseInt(process.env.REDIS_PORT || '6379'),
//   password: process.env.REDIS_PASSWORD || undefined,
//   maxRetriesPerRequest: null,
// };

// const defaultJobOptions = {
//   attempts: 3,
//   backoff: { type: 'exponential', delay: 5000 },
//   removeOnComplete: { count: 200, age: 24 * 3600 },
//   removeOnFail: { count: 100, age: 7 * 24 * 3600 },
// };

// const bookingConfirmedQueue = new Queue(QUEUE_NAMES.BOOKING_CONFIRMED, { connection, defaultJobOptions });
// const whatsappQueue        = new Queue(QUEUE_NAMES.WHATSAPP,          { connection, defaultJobOptions });
// const pdfQueue             = new Queue(QUEUE_NAMES.PDF_GENERATION,    { connection, defaultJobOptions });
// const emailQueue           = new Queue(QUEUE_NAMES.EMAIL,             { connection, defaultJobOptions });
// const notificationQueue    = new Queue(QUEUE_NAMES.NOTIFICATION,      { connection, defaultJobOptions });

// let workers = [];

// const initializeQueues = async () => {
//   workers = [
//     createBookingConfirmedWorker(connection),
//     createWhatsAppWorker(connection),
//     createPdfWorker(connection),
//   ];
// };

// const shutdownQueues = async () => {
//   await Promise.all(workers.map((w) => w.close()));
//   await Promise.all([
//     bookingConfirmedQueue.close(),
//     whatsappQueue.close(),
//     pdfQueue.close(),
//     emailQueue.close(),
//     notificationQueue.close(),
//   ]);
// };

const initializeQueues = async () => {};
const shutdownQueues  = async () => {};

const bookingConfirmedQueue = null;
const whatsappQueue        = null;
const pdfQueue             = null;
const emailQueue           = null;
const notificationQueue    = null;

module.exports = {
  initializeQueues,
  shutdownQueues,
  bookingConfirmedQueue,
  whatsappQueue,
  pdfQueue,
  emailQueue,
  notificationQueue,
};
