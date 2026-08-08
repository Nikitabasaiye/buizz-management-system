const PDFDocument = require('pdfkit');
const qrcode = require('qrcode');

async function generateTicketPDF({ booking, ticket }) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Header
      doc.fontSize(20).text('Buizz - Ticket', { align: 'center' });
      doc.moveDown();

      doc.fontSize(12).text(`Booking: ${booking.booking_number}`);
      doc.text(`Event: ${booking.event_title || 'Event'}`);
      doc.text(`Name: ${booking.user_name || booking.user_email || ''}`);
      doc.text(`Seats: ${booking.quantity}`);
      doc.text(`Amount: ${booking.total_amount}`);
      doc.moveDown();

      // QR code
      const qrData = ticket.qr_data || `booking:${booking.booking_id}:ticket:${ticket.ticket_id}`;
      const qrPng = await qrcode.toDataURL(qrData, { margin: 1 });
      const qrBase64 = qrPng.split(',')[1];
      const qrBuffer = Buffer.from(qrBase64, 'base64');
      doc.image(qrBuffer, { width: 150, align: 'center' });

      doc.moveDown();
      doc.fontSize(10).text('Please carry this ticket to the event. The QR code will be scanned at entry.', { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateTicketPDF };
