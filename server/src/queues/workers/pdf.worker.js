const { Worker } = require('bullmq');
const path = require('path');
const fs = require('fs');
const pdfService = require('../../services/pdf.service');
const ticketRepository = require('../../repositories/ticket.repository');
const paymentRepository = require('../../repositories/payment.repository');
const { QUEUE_NAMES } = require('../../constants');
const logger = require('../../utils/logger');
const { uploadToCloudinary, deleteLocalFile, isCloudinaryRequired } = require('../../config/upload');

const JOB_TYPES = {
  TICKET_PDF: 'ticket_pdf',
  INVOICE_PDF: 'invoice_pdf',
};

// Ensure PDF output directory exists
const PDF_DIR = path.join(process.cwd(), 'storage', 'pdfs');
if (!fs.existsSync(PDF_DIR)) {
  fs.mkdirSync(PDF_DIR, { recursive: true });
}

const processJob = async (job) => {
  const { type, data } = job.data;

  logger.info(`[PDF Worker] Processing job ${job.id} | type: ${type}`);

  switch (type) {
    case JOB_TYPES.TICKET_PDF: {
      const { ticketData, ticketNumber } = data;

      const pdfBuffer = await pdfService.generateTicketPdf(ticketData);

      const fileName = `ticket_${ticketNumber}_${Date.now()}.pdf`;
      const filePath = path.join(PDF_DIR, fileName);
      fs.writeFileSync(filePath, pdfBuffer);

      // Upload to Cloudinary if configured
      let cloudinaryUrl = null;
      let cloudinaryPublicId = null;
      
      const cloudinaryResult = await uploadToCloudinary(filePath, `tickets/${ticketNumber}`, {
        private: true,
        resourceType: 'raw',
        context: { ticket_number: String(ticketNumber) },
      });
      if (cloudinaryResult) {
        cloudinaryUrl = cloudinaryResult.url;
        cloudinaryPublicId = cloudinaryResult.publicId;
        // Delete local file after successful Cloudinary upload
        deleteLocalFile(filePath);
        logger.info('[PDF Worker] Ticket PDF uploaded to Cloudinary', { ticketNumber, cloudinaryUrl });
      }

      if (!cloudinaryResult && isCloudinaryRequired()) {
        throw new Error('Ticket PDF storage failed because Cloudinary is required');
      }

      const publicUrl = cloudinaryUrl || `/storage/pdfs/${fileName}`;

      logger.info('[PDF Worker] Ticket PDF generated', { ticketNumber, filePath, cloudinaryUrl });
      return { success: true, filePath, publicUrl, fileName, cloudinaryUrl, cloudinaryPublicId };
    }

    case JOB_TYPES.INVOICE_PDF: {
      const { invoiceData, orderId } = data;

      const pdfBuffer = await pdfService.generateInvoicePdf(invoiceData);

      const fileName = `invoice_${orderId}_${Date.now()}.pdf`;
      const filePath = path.join(PDF_DIR, fileName);
      fs.writeFileSync(filePath, pdfBuffer);

      // Upload to Cloudinary if configured
      let cloudinaryUrl = null;
      let cloudinaryPublicId = null;
      
      const cloudinaryResult = await uploadToCloudinary(filePath, `tickets/invoices/${orderId}`, {
        private: true,
        resourceType: 'raw',
        context: { order_id: String(orderId) },
      });
      if (cloudinaryResult) {
        cloudinaryUrl = cloudinaryResult.url;
        cloudinaryPublicId = cloudinaryResult.publicId;
        // Delete local file after successful Cloudinary upload
        deleteLocalFile(filePath);
        logger.info('[PDF Worker] Invoice PDF uploaded to Cloudinary', { orderId, cloudinaryUrl });
      }


      if (!cloudinaryResult && isCloudinaryRequired()) {
        throw new Error('Invoice PDF storage failed because Cloudinary is required');
      }

      const publicUrl = cloudinaryUrl || `/storage/pdfs/${fileName}`;

      logger.info('[PDF Worker] Invoice PDF generated', { orderId, filePath, cloudinaryUrl });
      return { success: true, filePath, publicUrl, fileName, cloudinaryUrl, cloudinaryPublicId };
    }

    default:
      logger.warn(`[PDF Worker] Unknown job type: ${type}`, { jobId: job.id });
      return { skipped: true, reason: 'unknown_type' };
  }
};

const createPdfWorker = (connection) => {
  const worker = new Worker(QUEUE_NAMES.PDF_GENERATION, processJob, {
    connection,
    prefix: process.env.BULLMQ_PREFIX || 'buizz',
    concurrency: 3,
  });

  worker.on('completed', (job, result) => {
    logger.info(`[PDF Worker] Job ${job.id} completed`, { publicUrl: result.publicUrl });
  });

  worker.on('failed', (job, err) => {
    logger.error(`[PDF Worker] Job ${job?.id} failed`, {
      error: err.message,
      attempts: job?.attemptsMade,
    });
  });

  worker.on('error', (err) => {
    logger.error('[PDF Worker] Worker error', { error: err.message });
  });

  return worker;
};

module.exports = { createPdfWorker, JOB_TYPES };
