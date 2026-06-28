const { Worker } = require('bullmq');
const { QUEUE_NAMES } = require('../../constants');
const logger = require('../../utils/logger');

// Lazy-loaded to avoid circular deps at startup
let whatsappQueue, pdfQueue;
const getQueues = () => {
  if (!whatsappQueue || !pdfQueue) {
    const queues = require('../index');
    whatsappQueue = queues.whatsappQueue;
    pdfQueue = queues.pdfQueue;
  }
  return { whatsappQueue, pdfQueue };
};

const { JOB_TYPES: WHATSAPP_JOB_TYPES } = require('./whatsapp.worker');
const { JOB_TYPES: PDF_JOB_TYPES } = require('./pdf.worker');

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 50 },
};

const processJob = async (job) => {
  const { payment, tickets, event, user } = job.data;

  logger.info(`[Booking Worker] Processing confirmed booking`, {
    jobId: job.id,
    orderId: payment.orderId,
    userId: user.id,
    ticketCount: tickets.length,
  });

  const { whatsappQueue: wq, pdfQueue: pq } = getQueues();

  // ── Step 1: Format shared data ─────────────────────────────────────────────
  const formattedDate = new Date(event.startDate).toLocaleString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const venueText =
    event.type === 'online'
      ? 'Online Event'
      : [event.venue?.name, event.venue?.city, event.venue?.state].filter(Boolean).join(', ') ||
        'Venue TBD';

  const amountFormatted = `₹${Number(payment.amount).toLocaleString('en-IN')}`;
  const subtotal = Number(payment.amount);
  const tax = parseFloat((subtotal * 0.18).toFixed(2));
  const total = parseFloat((subtotal + tax).toFixed(2));

  // ── Step 2: Enqueue WhatsApp booking confirmation ──────────────────────────
  if (user.phone) {
    await wq.add(
      'booking_confirmation',
      {
        type: WHATSAPP_JOB_TYPES.BOOKING_CONFIRMATION,
        data: {
          phoneNumber: user.phone,
          bookingDetails: {
            userName:      user.name,
            ticketNumber:  tickets[0].ticket_number,
            eventName:     event.title,
            eventDate:     formattedDate,
            eventVenue:    venueText,
            ticketType:    tickets[0].ticket_type,
            quantity:      String(tickets.length),
            amountPaid:    amountFormatted,
            orderId:       payment.orderId,
            transactionId: payment.transactionId || 'N/A',
          },
        },
      },
      { ...DEFAULT_JOB_OPTIONS, priority: 1 }
    );
    logger.info('[Booking Worker] WhatsApp job enqueued', { orderId: payment.orderId });
  }

  // ── Step 3: Enqueue Ticket PDF for each ticket ─────────────────────────────
  for (const ticket of tickets) {
    await pq.add(
      'ticket_pdf',
      {
        type: PDF_JOB_TYPES.TICKET_PDF,
        data: {
          ticketNumber: ticket.ticket_number,
          ticketData: {
            ticketNumber:  ticket.ticket_number,
            eventName:     event.title,
            eventDate:     formattedDate,
            eventVenue:    venueText,
            eventAddress:  event.venue?.address || '',
            userName:      user.name,
            userEmail:     user.email,
            ticketType:    ticket.ticket_type,
            price:         ticket.price,
            orderId:       payment.orderId,
            transactionId: payment.transactionId || 'N/A',
            qrCodeDataUrl: ticket.qr_code,
            organizerName: event.organizerName || 'Buizz',
          },
        },
      },
      { ...DEFAULT_JOB_OPTIONS, priority: 2 }
    );
  }
  logger.info('[Booking Worker] Ticket PDF jobs enqueued', {
    orderId: payment.orderId,
    count: tickets.length,
  });

  // ── Step 4: Enqueue Invoice PDF ────────────────────────────────────────────
  const invoiceNumber = `INV-${Date.now()}`;
  await pq.add(
    'invoice_pdf',
    {
      type: PDF_JOB_TYPES.INVOICE_PDF,
      data: {
        orderId: payment.orderId,
        invoiceData: {
          invoiceNumber,
          orderId:       payment.orderId,
          transactionId: payment.transactionId || 'N/A',
          paymentDate:   new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' }),
          userName:      user.name,
          userEmail:     user.email,
          userPhone:     user.phone || '',
          eventName:     event.title,
          eventDate:     formattedDate,
          eventVenue:    venueText,
          tickets:       tickets.map((t) => ({
            ticketNumber: t.ticket_number,
            ticketType:   t.ticket_type,
            price:        t.price,
          })),
          subtotal,
          tax,
          total,
          paymentMethod: payment.paymentMethod || 'PhonePe',
          organizerName: event.organizerName || 'Buizz',
        },
      },
    },
    { ...DEFAULT_JOB_OPTIONS, priority: 2 }
  );
  logger.info('[Booking Worker] Invoice PDF job enqueued', { orderId: payment.orderId, invoiceNumber });

  return {
    success: true,
    orderId: payment.orderId,
    jobsEnqueued: {
      whatsapp: !!user.phone,
      ticketPdfs: tickets.length,
      invoicePdf: 1,
    },
  };
};

const createBookingConfirmedWorker = (connection) => {
  const worker = new Worker(QUEUE_NAMES.BOOKING_CONFIRMED, processJob, {
    connection,
    concurrency: 10,
  });

  worker.on('completed', (job, result) => {
    logger.info(`[Booking Worker] Job ${job.id} completed`, { result });
  });

  worker.on('failed', (job, err) => {
    logger.error(`[Booking Worker] Job ${job?.id} failed`, {
      error: err.message,
      attempts: job?.attemptsMade,
    });
  });

  worker.on('error', (err) => {
    logger.error('[Booking Worker] Worker error', { error: err.message });
  });

  return worker;
};

module.exports = { createBookingConfirmedWorker };
