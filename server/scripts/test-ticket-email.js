require('dotenv').config();

const QRCode = require('qrcode');
const pdfService = require('../src/services/pdf.service');
const { sendTicketPdfEmail } = require('../src/utils/email');

const to = process.argv[2] || process.env.SMTP_TEST_TO || process.env.SMTP_USER;

async function main() {
  if (!to) {
    throw new Error('Pass recipient email: node scripts/test-ticket-email.js user@example.com');
  }

  const ticketNumber = `SMTP-TEST-${Date.now()}`;
  const qrCodeDataUrl = await QRCode.toDataURL(
    `${(process.env.API_URL || 'https://api.buizz.com').replace(/\/+$/, '').replace(/\/api\/v1$/i, '')}/api/v1/qr/redirect/${ticketNumber}`,
    { errorCorrectionLevel: 'H', margin: 3, width: 512 }
  );

  const pdfBuffer = await pdfService.generateTicketPdf({
    ticketNumber,
    eventName: 'Buizz Email Test',
    eventDate: new Date().toLocaleString('en-IN'),
    eventTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    eventVenue: 'SMTP Test Venue',
    ticketType: 'General',
    price: 1,
    quantity: 1,
    qrCodeDataUrl,
    organizerName: 'Buizz',
    category: 'Test',
    totalSeats: 1,
    seatInfo: 'General x1',
  });

  const result = await sendTicketPdfEmail({
    to,
    userName: 'Buizz User',
    eventName: 'Buizz Email Test',
    eventDate: new Date().toLocaleString('en-IN'),
    eventTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    eventVenue: 'SMTP Test Venue',
    ticketNumber,
    ticketType: 'General',
    quantity: 1,
    amountPaid: 'Rs. 1',
    orderId: `SMTP-${Date.now()}`,
    qrCodeDataUrl,
    category: 'Test',
    organizerName: 'Buizz',
    attachments: [{
      filename: `Buizz-Ticket-${ticketNumber}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    }],
  });

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error?.stack || error?.message || error}\n`);
  process.exit(1);
});
