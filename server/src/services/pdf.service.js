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
      eventTime,
      eventVenue,
      ticketType,
      price,
      quantity = 1,
      qrCodeDataUrl,
      organizerName = 'Buizz Organizer',
      eventBanner,
      category = 'Music Events',
      seatInfo,
      totalSeats,
      seatGroups,
    } = ticketData;

    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: [506, 667], margin: 0 });
        const buffers = [];

        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const W = 506;
        const H = 667;
        const cardX = 32;
        const cardY = 10;
        const cardW = 430;
        const cardH = 650;
        const pink = '#EC1B72';
        const pinkText = '#ff4fa0';
        const dark = '#08000d';
        const tableBorder = '#322436';
        const seats = Number(totalSeats || quantity || 1);
        const groups = Array.isArray(seatGroups) && seatGroups.length
          ? seatGroups
          : [{
              section: 'General',
              totalSeats: seats,
              seatNumbers: seatInfo || `${ticketType || 'General'} x${seats}`,
              amount: Number(price || 0),
            }];
        const totalAmount = Number(price || groups.reduce((sum, group) => sum + Number(group.amount || 0), 0));
        let qrBuffer = null;

        if (qrCodeDataUrl) {
          qrBuffer = Buffer.from(String(qrCodeDataUrl).replace(/^data:image\/png;base64,/, ''), 'base64');
        } else {
          const qrDataUrl = await QRCode.toDataURL(String(ticketNumber || 'BUIZZ-TICKET'), {
            errorCorrectionLevel: 'H',
            margin: 3,
            width: 512,
            color: { dark: '#090a0d', light: '#ffffff' },
          });
          qrBuffer = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
        }

        doc.rect(0, 0, W, H).fill('#111827');
        doc.roundedRect(cardX, cardY, cardW, cardH, 28).fill(dark);
        doc.roundedRect(cardX, cardY, cardW, cardH, 28).lineWidth(1).stroke(pink);

        const headerH = 250;
        doc.save();
        doc.roundedRect(cardX, cardY, cardW, headerH, 28).clip();
        doc.rect(cardX, cardY, cardW, headerH).fill('#100014');
        if (eventBanner) {
          try {
            doc.image(eventBanner, cardX, cardY, { width: cardW, height: headerH });
          } catch (error) {
            logger.warn('Ticket PDF banner could not be embedded', { error: error.message });
          }
        }
        doc.rect(cardX, cardY, cardW, headerH).fillOpacity(0.74).fill('#050006');
        doc.fillOpacity(1);
        doc.restore();

        doc.font('Helvetica-Bold').fontSize(26).fillColor(pink).text('Buizz', 58, 30);
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff').text('BUIZZ PASS', 308, 28, { width: 78, align: 'center' });
        doc.roundedRect(314, 48, 65, 24, 12).fill(pink);
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff').text('VALID', 314, 56, { width: 65, align: 'center' });

        const initials = organizerName
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase())
          .join('') || 'BE';
        doc.circle(412, 44, 22).fill('#ffffff');
        doc.font('Helvetica-Bold').fontSize(12).fillColor(pink).text(initials, 390, 39, { width: 44, align: 'center' });
        doc.font('Helvetica-Bold').fontSize(7).fillColor(pinkText).text(organizerName, 384, 75, { width: 58, align: 'center', ellipsis: true });

        doc.font('Helvetica-Bold').fontSize(23).fillColor('#ffffff').text(eventName || 'Buizz Event', 48, 106, {
          width: 360,
          height: 58,
          ellipsis: true,
        });
        doc.roundedRect(48, 138, 132, 27, 14).fillOpacity(0.2).fill(pink);
        doc.fillOpacity(1).font('Helvetica-Bold').fontSize(10).fillColor(pinkText).text(category || 'Music Events', 78, 147, {
          width: 96,
          ellipsis: true,
        });

        const metaY = 182;
        this._ticketMeta(doc, 50, metaY, 'CAL', eventDate || 'Date pending');
        this._ticketMeta(doc, 50, metaY + 25, 'CLK', eventTime || 'Time pending');
        this._ticketMeta(doc, 50, metaY + 50, 'PIN', eventVenue || 'Venue pending');

        doc.save();
        doc.dash(3, { space: 3 }).moveTo(49, 259).lineTo(445, 259).lineWidth(1).strokeColor(pink).stroke();
        doc.undash();
        doc.restore();
        doc.circle(32, 260, 16).fill('#111827').strokeColor(pink).stroke();
        doc.circle(462, 260, 16).fill('#111827').strokeColor(pink).stroke();

        doc.font('Helvetica-Bold').fontSize(10).fillColor(pinkText).text('BOOKING ID', 48, 291);
        doc.font('Helvetica-Bold').fontSize(16).fillColor('#ffffff').text(ticketNumber || 'BUIZZ-TICKET', 48, 315, {
          width: 245,
          ellipsis: true,
        });
        this._ticketMeta(doc, 50, 350, 'TKT', `${seats} ${seats === 1 ? 'seat' : 'seats'} on this pass`);
        this._ticketMeta(doc, 50, 372, 'OK', 'Scan at Gate Entry');

        const qrX = 342;
        const qrY = 277;
        doc.roundedRect(qrX, qrY, 108, 108, 17).fill('#ffffff').strokeColor(pink).lineWidth(1).stroke();
        doc.image(qrBuffer, qrX + 6, qrY + 6, { width: 96, height: 96 });
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff').text('SCAN AT GATE ENTRY', qrX - 2, qrY + 110, {
          width: 104,
          align: 'center',
        });

        const seatsY = 412;
        doc.font('Helvetica-Bold').fontSize(10).fillColor(pinkText).text('SELECTED SEATS', 48, seatsY);
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff').text(`${seats} total`, 390, seatsY, {
          width: 55,
          align: 'right',
        });

        const tableX = 48;
        const tableY = 432;
        const tableW = 398;
        const rowH = 38;
        doc.roundedRect(tableX, tableY, tableW, 90, 18).lineWidth(1).strokeColor(tableBorder).stroke();
        doc.rect(tableX, tableY, tableW, 52).fill('#17101d');
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
        doc.text('SECTION', tableX + 8, tableY + 17, { width: 94 });
        doc.text('TOTAL\nSEATS', tableX + 118, tableY + 12, { width: 60 });
        doc.text('SEAT NUMBERS', tableX + 190, tableY + 17, { width: 104 });
        doc.text('AMOUNT', tableX + 310, tableY + 17, { width: 76 });

        const firstGroup = groups[0];
        const rowY = tableY + 52;
        doc.rect(tableX, rowY, tableW, rowH).fill(dark);
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#a855f7').text(firstGroup.section || 'General', tableX + 8, rowY + 13, { width: 94, ellipsis: true });
        doc.fillColor('#ffffff').text(String(firstGroup.totalSeats || seats), tableX + 118, rowY + 13, { width: 60 });
        doc.fillColor(pinkText).text(firstGroup.seatNumbers || `${ticketType || 'General'} x${seats}`, tableX + 190, rowY + 13, { width: 104, ellipsis: true });
        doc.fillColor('#ffffff').text(this._currency(firstGroup.amount || totalAmount), tableX + 310, rowY + 13, { width: 76, ellipsis: true });

        doc.moveTo(48, 538).lineTo(446, 538).lineWidth(1).strokeColor(tableBorder).stroke();
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff').text('TOTAL AMOUNT PAID', 48, 562);
        doc.font('Helvetica-Bold').fontSize(24).fillColor(pinkText).text(this._currency(totalAmount), 330, 554, {
          width: 116,
          align: 'right',
        });

        doc.save();
        doc.dash(3, { space: 3 }).moveTo(48, 593).lineTo(446, 593).lineWidth(1).strokeColor(tableBorder).stroke();
        doc.undash();
        doc.restore();
        doc.circle(55, 618, 6).strokeColor(pinkText).stroke();
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff').text(
          'Please show this ticket at venue entry. This is a single entry ticket for all selected seats.',
          69,
          613,
          { width: 355 }
        );

        doc.end();
      } catch (err) {
        logger.error('Ticket PDF generation failed', { error: err.message });
        reject(err);
      }
    });
  }
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
  _ticketMeta(doc, x, y, icon, value) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#ff4fa0').text(icon, x, y, { width: 18 });
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff').text(value || 'Pending', x + 21, y - 1, {
      width: 360,
      ellipsis: true,
    });
  }

  _currency(amount) {
    return `Rs.${Math.max(0, Math.round(Number(amount || 0))).toLocaleString('en-IN')}`;
  }

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
