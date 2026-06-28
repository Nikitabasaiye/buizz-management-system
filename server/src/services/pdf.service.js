const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const logger = require('../utils/logger');

class PdfService {
  // ─── Ticket PDF ─────────────────────────────────────────────────────────────
  async generateTicketPdf(ticketData) {
    const {
      ticketNumber,
      eventName,
      eventDate,
      eventVenue,
      eventAddress,
      userName,
      userEmail,
      ticketType,
      price,
      orderId,
      transactionId,
      qrCodeDataUrl,
      organizerName,
      eventBanner,
    } = ticketData;

    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 0 });
        const buffers = [];

        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const W = 595.28;
        const H = 841.89;

        // ── Background ──────────────────────────────────────────────────────
        doc.rect(0, 0, W, H).fill('#0f0f1a');

        // ── Header gradient bar ──────────────────────────────────────────────
        doc.rect(0, 0, W, 8).fill('#6c63ff');

        // ── Brand header ────────────────────────────────────────────────────
        doc.rect(0, 8, W, 80).fill('#1a1a2e');
        doc
          .font('Helvetica-Bold')
          .fontSize(28)
          .fillColor('#6c63ff')
          .text('BUIZZ', 40, 28);
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor('#888888')
          .text('Event Management Platform', 40, 58);

        // ── TICKET label ─────────────────────────────────────────────────────
        doc
          .font('Helvetica-Bold')
          .fontSize(11)
          .fillColor('#6c63ff')
          .text('E-TICKET', W - 120, 38, { width: 80, align: 'right' });
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor('#888888')
          .text('ADMIT ONE', W - 120, 54, { width: 80, align: 'right' });

        // ── Event name block ─────────────────────────────────────────────────
        doc.rect(0, 88, W, 100).fill('#16213e');
        doc
          .font('Helvetica-Bold')
          .fontSize(22)
          .fillColor('#ffffff')
          .text(eventName, 40, 108, { width: W - 80 });
        doc
          .font('Helvetica')
          .fontSize(11)
          .fillColor('#6c63ff')
          .text(`${ticketType.toUpperCase()} TICKET`, 40, 158);

        // ── Divider ──────────────────────────────────────────────────────────
        doc.rect(0, 188, W, 2).fill('#6c63ff');

        // ── Details section ──────────────────────────────────────────────────
        const detailY = 210;
        const col1 = 40;
        const col2 = W / 2 + 20;

        this._detailBlock(doc, col1, detailY,      '📅  DATE & TIME',   eventDate);
        this._detailBlock(doc, col2, detailY,      '📍  VENUE',         eventVenue);
        this._detailBlock(doc, col1, detailY + 80, '👤  ATTENDEE',      userName);
        this._detailBlock(doc, col2, detailY + 80, '✉️  EMAIL',          userEmail);
        this._detailBlock(doc, col1, detailY + 160,'🎫  TICKET TYPE',   ticketType.toUpperCase());
        this._detailBlock(doc, col2, detailY + 160,'💰  AMOUNT PAID',   `₹${Number(price).toLocaleString('en-IN')}`);

        // ── Ticket number ────────────────────────────────────────────────────
        doc.rect(40, detailY + 260, W - 80, 50).fill('#1a1a2e').stroke('#6c63ff');
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor('#888888')
          .text('TICKET NUMBER', 60, detailY + 270);
        doc
          .font('Helvetica-Bold')
          .fontSize(14)
          .fillColor('#ffffff')
          .text(ticketNumber, 60, detailY + 284);

        // ── QR Code ──────────────────────────────────────────────────────────
        const qrY = detailY + 330;
        doc.rect(0, qrY - 10, W, 200).fill('#16213e');

        if (qrCodeDataUrl) {
          const qrBase64 = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
          const qrBuffer = Buffer.from(qrBase64, 'base64');
          doc.image(qrBuffer, W / 2 - 70, qrY + 10, { width: 140, height: 140 });
        }

        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor('#888888')
          .text('Scan QR code at venue entrance', 0, qrY + 158, { align: 'center', width: W });

        // ── Footer ───────────────────────────────────────────────────────────
        const footerY = qrY + 200;
        doc.rect(0, footerY, W, 1).fill('#333333');
        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor('#555555')
          .text(`Order ID: ${orderId}   |   Transaction ID: ${transactionId}`, 0, footerY + 12, {
            align: 'center',
            width: W,
          });
        doc
          .fontSize(8)
          .fillColor('#555555')
          .text('This is a valid e-ticket. Please present at the venue entrance.', 0, footerY + 26, {
            align: 'center',
            width: W,
          });
        doc
          .fontSize(8)
          .fillColor('#333333')
          .text('© Buizz Event Management Platform', 0, footerY + 40, {
            align: 'center',
            width: W,
          });

        doc.end();
      } catch (err) {
        logger.error('Ticket PDF generation failed', { error: err.message });
        reject(err);
      }
    });
  }

  // ─── Invoice PDF ─────────────────────────────────────────────────────────────
  async generateInvoicePdf(invoiceData) {
    const {
      invoiceNumber,
      orderId,
      transactionId,
      paymentDate,
      userName,
      userEmail,
      userPhone,
      eventName,
      eventDate,
      eventVenue,
      tickets,
      subtotal,
      tax,
      total,
      paymentMethod,
      organizerName,
    } = invoiceData;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const buffers = [];

        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const W = 595.28 - 100; // usable width with margins

        // ── Header ───────────────────────────────────────────────────────────
        doc
          .font('Helvetica-Bold')
          .fontSize(28)
          .fillColor('#6c63ff')
          .text('BUIZZ', 50, 50);
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor('#888888')
          .text('Event Management Platform', 50, 82);

        doc
          .font('Helvetica-Bold')
          .fontSize(20)
          .fillColor('#1a1a2e')
          .text('INVOICE', 50, 50, { align: 'right', width: W });
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor('#888888')
          .text(`#${invoiceNumber}`, 50, 76, { align: 'right', width: W });

        // ── Divider ──────────────────────────────────────────────────────────
        doc.moveTo(50, 105).lineTo(545, 105).strokeColor('#6c63ff').lineWidth(2).stroke();

        // ── Invoice meta ─────────────────────────────────────────────────────
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor('#555555')
          .text(`Invoice Date: ${paymentDate}`, 50, 118)
          .text(`Order ID: ${orderId}`, 50, 132)
          .text(`Transaction ID: ${transactionId}`, 50, 146)
          .text(`Payment Method: ${paymentMethod || 'PhonePe'}`, 50, 160);

        // ── Bill To ──────────────────────────────────────────────────────────
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor('#1a1a2e')
          .text('BILL TO', 350, 118);
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor('#555555')
          .text(userName, 350, 132)
          .text(userEmail, 350, 146)
          .text(userPhone || '', 350, 160);

        // ── Event info ───────────────────────────────────────────────────────
        doc.rect(50, 185, W, 55).fill('#f8f8ff').stroke('#e0e0e0');
        doc
          .font('Helvetica-Bold')
          .fontSize(9)
          .fillColor('#6c63ff')
          .text('EVENT DETAILS', 65, 195);
        doc
          .font('Helvetica-Bold')
          .fontSize(11)
          .fillColor('#1a1a2e')
          .text(eventName, 65, 208);
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor('#555555')
          .text(`${eventDate}  |  ${eventVenue}`, 65, 224);

        // ── Table header ─────────────────────────────────────────────────────
        const tableTop = 260;
        doc.rect(50, tableTop, W, 24).fill('#1a1a2e');
        doc
          .font('Helvetica-Bold')
          .fontSize(9)
          .fillColor('#ffffff')
          .text('TICKET TYPE',   65,  tableTop + 8)
          .text('TICKET NO.',    220, tableTop + 8)
          .text('QTY',           370, tableTop + 8)
          .text('UNIT PRICE',    410, tableTop + 8)
          .text('AMOUNT',        490, tableTop + 8);

        // ── Table rows ───────────────────────────────────────────────────────
        let rowY = tableTop + 24;
        tickets.forEach((ticket, i) => {
          const bg = i % 2 === 0 ? '#ffffff' : '#f9f9ff';
          doc.rect(50, rowY, W, 22).fill(bg);
          doc
            .font('Helvetica')
            .fontSize(9)
            .fillColor('#333333')
            .text(ticket.ticketType,                    65,  rowY + 7)
            .text(ticket.ticketNumber,                  220, rowY + 7)
            .text('1',                                  375, rowY + 7)
            .text(`₹${Number(ticket.price).toLocaleString('en-IN')}`, 410, rowY + 7)
            .text(`₹${Number(ticket.price).toLocaleString('en-IN')}`, 490, rowY + 7);
          rowY += 22;
        });

        // ── Table border ─────────────────────────────────────────────────────
        doc.rect(50, tableTop, W, rowY - tableTop).stroke('#e0e0e0');

        // ── Totals ───────────────────────────────────────────────────────────
        const totalsX = 380;
        rowY += 16;
        this._invoiceLine(doc, totalsX, rowY,      'Subtotal',  `₹${Number(subtotal).toLocaleString('en-IN')}`, false);
        this._invoiceLine(doc, totalsX, rowY + 18, 'GST (18%)', `₹${Number(tax).toLocaleString('en-IN')}`, false);
        doc.moveTo(totalsX, rowY + 38).lineTo(545, rowY + 38).strokeColor('#6c63ff').lineWidth(1).stroke();
        this._invoiceLine(doc, totalsX, rowY + 44, 'TOTAL PAID', `₹${Number(total).toLocaleString('en-IN')}`, true);

        // ── Payment status badge ──────────────────────────────────────────────
        doc.rect(50, rowY + 44, 120, 24).fill('#e8f5e9').stroke('#4caf50');
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor('#2e7d32')
          .text('✓  PAID', 65, rowY + 52);

        // ── Footer ───────────────────────────────────────────────────────────
        const footerY = 760;
        doc.moveTo(50, footerY).lineTo(545, footerY).strokeColor('#e0e0e0').lineWidth(1).stroke();
        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor('#aaaaaa')
          .text('Thank you for booking with Buizz! For support, contact support@buizz.com', 50, footerY + 10, {
            align: 'center',
            width: W,
          });
        doc
          .fontSize(8)
          .fillColor('#cccccc')
          .text('© Buizz Event Management Platform  |  This is a computer-generated invoice.', 50, footerY + 24, {
            align: 'center',
            width: W,
          });

        doc.end();
      } catch (err) {
        logger.error('Invoice PDF generation failed', { error: err.message });
        reject(err);
      }
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  _detailBlock(doc, x, y, label, value) {
    doc.font('Helvetica').fontSize(8).fillColor('#888888').text(label, x, y, { width: 230 });
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#ffffff').text(value || '—', x, y + 14, { width: 230 });
  }

  _invoiceLine(doc, x, y, label, value, bold) {
    const font = bold ? 'Helvetica-Bold' : 'Helvetica';
    const color = bold ? '#6c63ff' : '#555555';
    doc.font(font).fontSize(bold ? 11 : 9).fillColor(color).text(label, x, y).text(value, x + 100, y, { align: 'right', width: 65 });
  }
}

module.exports = new PdfService();
