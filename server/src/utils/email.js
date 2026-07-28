const nodemailer = require('nodemailer');
const logger = require('./logger');

const hasSmtpConfig = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const createTransporter = () => {
  if (!hasSmtpConfig()) {
    throw new Error('SMTP configuration is incomplete. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS.');
  }

  const rejectUnauthorized = process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false';

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    tls: {
      rejectUnauthorized
    },
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const sendEmail = async ({ to, subject, text, html, from }) => {
  if (!hasSmtpConfig()) {
    logger.warn('SMTP configuration is missing for email functionality');
    logger.info('Email would have been sent:', { to, subject });
   
    // Return skipped status instead of throwing error to allow booking to proceed
    return { skipped: true, reason: 'SMTP_NOT_CONFIGURED' };
  }

  try {
    const transporter = createTransporter();
    const message = {
      from: from || process.env.SMTP_FROM || `Buizz <${process.env.SMTP_USER}>`,
      replyTo: process.env.SMTP_REPLY_TO || process.env.SMTP_USER,
      to,
      subject,
      text,
      html
    };

    const info = await transporter.sendMail(message);
    logger.info(`Email sent: ${info.messageId} to ${to}`);
    return info;
  } catch (error) {
    logger.error('Failed to send email', { error: error.message, to, subject });
    // Return error status instead of throwing to allow booking to proceed
    return { skipped: true, reason: 'SMTP_ERROR', error: error.message };
  }
};

const sendTicketConfirmationEmail = async ({ to, userName, eventName, eventDate, eventVenue, ticketNumber, ticketType, quantity, amountPaid, orderId }) => {
  const subject = `Your Buizz Ticket Confirmation - ${eventName}`;
  const text = `Hi ${userName},\n\nYour ticket has been booked successfully!\n\nEvent: ${eventName}\nDate: ${eventDate}\nVenue: ${eventVenue}\nTicket Number: ${ticketNumber}\nTicket Type: ${ticketType}\nQuantity: ${quantity}\nAmount Paid: ${amountPaid}\nOrder ID: ${orderId}\n\nPlease show this ticket at the venue entrance.\n\nThank you for choosing Buizz!`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #070a1a;">Your Ticket is Confirmed!</h2>
      <p>Hi ${userName},</p>
      <p>Your ticket has been booked successfully. Here are your ticket details:</p>
      <div style="background: #f8f9fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Event:</strong> ${eventName}</p>
        <p><strong>Date:</strong> ${eventDate}</p>
        <p><strong>Venue:</strong> ${eventVenue}</p>
        <p><strong>Ticket Number:</strong> ${ticketNumber}</p>
        <p><strong>Ticket Type:</strong> ${ticketType}</p>
        <p><strong>Quantity:</strong> ${quantity}</p>
        <p><strong>Amount Paid:</strong> ${amountPaid}</p>
        <p><strong>Order ID:</strong> ${orderId}</p>
      </div>
      <p>Please show this ticket at the venue entrance.</p>
      <p style="color: #666; font-size: 14px;">Thank you for choosing Buizz!</p>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
};

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const formatMoney = (value) => {
  if (typeof value === 'string' && /^(Rs\.|Rs\s|&#8377;)/i.test(value.trim())) {
    return escapeHtml(value.trim().replace(/^Rs\s+/i, 'Rs.'));
  }
  const amount = Number(value || 0);
  return `&#8377;${Math.max(0, Math.round(Number.isFinite(amount) ? amount : 0)).toLocaleString('en-IN')}`;
};

// Sends ticket confirmation with PDF attachments
const sendTicketPdfEmail = async ({
  to,
  userName,
  eventName,
  eventDate,
  eventTime,
  eventVenue,
  ticketNumber,
  ticketType,
  quantity,
  amountPaid,
  orderId,
  qrCodeDataUrl,
  eventImage,
  category = 'Music Events',
  organizerName = 'Buizz Organizer',
  seatGroups = [],
  attachments = []
}) => {
  const amountText = formatMoney(amountPaid);
  const normalizedSeatGroups = seatGroups.length ? seatGroups : [{
    section: ticketType || 'General',
    totalSeats: quantity || 1,
    seatNumbers: `${ticketType || 'General'} x${quantity || 1}`,
    amount: amountText,
  }];
  const seatRows = normalizedSeatGroups.map((group) => `
    <tr>
      <td style="padding:12px 8px;border-top:1px solid rgba(255,255,255,.10);font-weight:900;color:#b56bff;">${escapeHtml(group.section || 'General')}</td>
      <td style="padding:12px 8px;border-top:1px solid rgba(255,255,255,.10);font-weight:900;color:#fff;">${escapeHtml(String(group.totalSeats || quantity || 1))}</td>
      <td style="padding:12px 8px;border-top:1px solid rgba(255,255,255,.10);font-weight:900;color:#ff5ba5;">${escapeHtml(group.seatNumbers || `${ticketType || 'General'} x${quantity || 1}`)}</td>
      <td style="padding:12px 8px;border-top:1px solid rgba(255,255,255,.10);font-weight:900;color:#fff;">${formatMoney(group.amount || amountPaid)}</td>
    </tr>
  `).join('');
  const qrHtml = qrCodeDataUrl
    ? `<img src="${qrCodeDataUrl}" alt="Ticket QR" style="display:block;width:120px;height:120px;object-fit:contain;border:0;" />`
    : `<div style="width:120px;height:120px;line-height:120px;text-align:center;color:#111827;font-weight:900;font-size:18px;">QR</div>`;
  const headerImage = eventImage
    ? `background-image:linear-gradient(180deg,rgba(0,0,0,.58),rgba(8,0,13,.96)),url('${eventImage}');`
    : 'background-image:radial-gradient(circle at 18% 12%,rgba(236,27,114,.48),transparent 32%),linear-gradient(145deg,#21002d,#08000d 58%,#16001e);';
  const subject = `Your Buizz Ticket is Ready - ${eventName}`;
  const text = `Hi ${userName},\n\nYour Buizz ticket is attached to this email.\n\nEvent: ${eventName}\nDate: ${eventDate}\nTime: ${eventTime || 'Time pending'}\nVenue: ${eventVenue}\nBooking ID: ${ticketNumber}\nTicket Type: ${ticketType}\nQuantity: ${quantity}\nAmount Paid: ${amountPaid}\nOrder ID: ${orderId}\n\nPresent the PDF or QR code at the venue entrance.\n\nThank you for choosing Buizz!`;

  const html = `
    <div style="margin:0;padding:20px;background:#111827;font-family:Arial,sans-serif;color:#ffffff;">
      <div style="max-width:460px;margin:0 auto;overflow:hidden;border:1px solid rgba(236,27,114,.70);border-radius:30px;background:#08000d;box-shadow:0 26px 80px rgba(0,0,0,.42);">
        <div style="min-height:220px;padding:18px 16px;background-size:cover;background-position:center;${headerImage}">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="font-size:28px;font-weight:900;color:#EC1B72;line-height:1;">Buizz</td>
              <td align="right">
                <div style="font-size:10px;font-weight:900;letter-spacing:.12em;color:#fff;">BUIZZ PASS</div>
                <div style="display:inline-block;margin-top:8px;padding:7px 15px;border-radius:999px;background:#EC1B72;color:#fff;font-size:10px;font-weight:900;">VALID</div>
              </td>
            </tr>
          </table>
          <h1 style="margin:48px 0 10px;font-size:26px;line-height:1.1;color:#fff;font-weight:900;">${escapeHtml(eventName)}</h1>
          <div style="display:inline-block;margin-bottom:15px;padding:7px 13px;border-radius:999px;background:rgba(236,27,114,.18);color:#ff5ba5;font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;">${escapeHtml(category)}</div>
          <div style="font-size:12px;font-weight:700;line-height:1.9;color:rgba(255,255,255,.88);">
            <div><span style="color:#ff5ba5;font-weight:900;">CAL</span>&nbsp;&nbsp;${escapeHtml(eventDate)}</div>
            <div><span style="color:#ff5ba5;font-weight:900;">CLK</span>&nbsp;&nbsp;${escapeHtml(eventTime || 'Time pending')}</div>
            <div><span style="color:#ff5ba5;font-weight:900;">PIN</span>&nbsp;&nbsp;${escapeHtml(eventVenue)}</div>
          </div>
        </div>
        <div style="border-top:2px dashed rgba(236,27,114,.75);padding:16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="vertical-align:top;">
                <div style="color:#ff5ba5;font-size:11px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;">Booking ID</div>
                <div style="margin-top:8px;color:#fff;font-size:18px;font-weight:900;word-break:break-all;">${escapeHtml(ticketNumber)}</div>
                <div style="margin-top:12px;color:rgba(255,255,255,.72);font-size:12px;font-weight:700;line-height:1.8;">
                  <div><span style="color:#ff5ba5;">TKT</span>&nbsp;&nbsp;${quantity || 1} ${(quantity || 1) === 1 ? 'seat' : 'seats'} on this pass</div>
                  <div><span style="color:#ff5ba5;">OK</span>&nbsp;&nbsp;Scan at Gate Entry</div>
                </div>
              </td>
              <td align="center" style="width:144px;">
                <div style="width:128px;height:128px;border:1px solid rgba(236,27,114,.65);border-radius:18px;background:#fff;padding:4px;">${qrHtml}</div>
                <div style="margin-top:5px;color:rgba(255,255,255,.70);font-size:10px;font-weight:900;text-transform:uppercase;">Scan at Gate Entry</div>
              </td>
            </tr>
          </table>
          <div style="margin-top:18px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid rgba(255,255,255,.14);border-radius:16px;overflow:hidden;color:#fff;font-size:11px;">
              <thead>
                <tr style="background:rgba(255,255,255,.07);color:rgba(255,255,255,.72);font-size:10px;text-transform:uppercase;">
                  <th align="left" style="padding:12px 8px;">Section</th>
                  <th align="left" style="padding:12px 8px;">Total Seats</th>
                  <th align="left" style="padding:12px 8px;">Seat Numbers</th>
                  <th align="left" style="padding:12px 8px;">Amount</th>
                </tr>
              </thead>
              <tbody>${seatRows}</tbody>
            </table>
          </div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:16px;border-top:1px solid rgba(255,255,255,.14);padding-top:16px;">
            <tr>
              <td style="color:rgba(255,255,255,.58);font-size:11px;font-weight:900;text-transform:uppercase;">Total Amount Paid</td>
              <td align="right" style="color:#ff5ba5;font-size:25px;font-weight:900;">${amountText}</td>
            </tr>
          </table>
          <div style="margin-top:16px;border-top:1px dashed rgba(255,255,255,.18);padding-top:14px;color:rgba(255,255,255,.78);font-size:11px;font-weight:600;line-height:1.5;">
            Please show this ticket at venue entry. This is a single entry ticket for all selected seats.
          </div>
          <div style="margin-top:16px;color:rgba(255,255,255,.50);font-size:8px;text-align:center;">Buizz Event Management Platform | ${escapeHtml(organizerName)}</div>
        </div>
      </div>
      <div style="max-width:460px;margin:14px auto 0;color:#cbd5e1;font-size:12px;text-align:center;">Your official ticket PDF is attached.</div>
    </div>
  `;

  if (!hasSmtpConfig()) {
    logger.warn('Ticket PDF email skipped because SMTP is not configured', { to, subject });
    return { skipped: true, reason: 'SMTP_NOT_CONFIGURED' };
  }

  try {
    const transporter = createTransporter();
    const message = {
      from: process.env.SMTP_FROM || `Buizz <${process.env.SMTP_USER}>`,
      replyTo: process.env.SMTP_REPLY_TO || process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
      attachments: attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType || 'application/pdf',
      })),
    };

    const info = await transporter.sendMail(message);
    logger.info(`Ticket PDF email sent: ${info.messageId} to ${to}`);
    return { sent: true, messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
  } catch (error) {
    logger.error('Failed to send ticket PDF email', { error: error.message, to, subject });
    return { skipped: true, reason: 'SMTP_ERROR', error: error.message };
  }
};
const sendPasswordResetEmail = async ({ to, name, token }) => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://www.buizz.com';
  const resetLink = `${frontendUrl}/organizer/reset-password?token=${token}`;
  
  const subject = 'Reset Your Buizz Organizer Password';
  const text = `Hi ${name},\n\nYou requested to reset your password. Click the link below to reset it:\n\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nThank you,\nBuizz Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f5f5;">
      <div style="background: #0f0f1a; padding: 32px; text-align: center;">
        <h1 style="color: #ed1c72; margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 2px;">BUIZZ</h1>
        <p style="color: #ffffff; margin: 8px 0 0; font-size: 14px;">Event Management Platform</p>
      </div>
      <div style="background: #ffffff; padding: 32px; border-radius: 8px; margin: 20px;">
        <h2 style="color: #0f0f1a; margin: 0 0 16px; font-size: 22px;">Reset Your Password</h2>
        <p style="color: #333; margin: 0 0 24px; font-size: 14px; line-height: 1.6;">
          Hi ${name},<br><br>
          You requested to reset your password. Click the button below to reset it:
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetLink}" style="display: inline-block; background: #ed1c72; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; margin: 24px 0 8px; font-size: 12px;">Or copy and paste this link:</p>
        <p style="color: #ed1c72; margin: 0 0 24px; font-size: 12px; word-break: break-all;">${resetLink}</p>
        <p style="color: #666; margin: 0 0 8px; font-size: 12px;">This link will expire in 1 hour.</p>
        <p style="color: #666; margin: 0; font-size: 12px;">If you didn't request this, please ignore this email.</p>
      </div>
      <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
        <p style="margin: 0;">© Buizz Event Management Platform</p>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
};

module.exports = { sendEmail, sendTicketConfirmationEmail, sendTicketPdfEmail, sendPasswordResetEmail };
