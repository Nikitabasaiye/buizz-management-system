const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { Worker } = require('bullmq');
const { connection } = require('./queue');
const { generateTicketPDF } = require('../services/pdf');
const { uploadBuffer } = require('../services/s3');
const { sendEmail } = require('../services/email');
const { sendTemplateMessage, sendTextMessage } = require('../services/whatsapp');
const db = require('../database/mysql');

const worker = new Worker('notifications', async (job) => {
  const { name, data } = job;
  if (name === 'ticket') {
    // data: { booking, ticket, user }
    const { booking, ticket, user } = data;
    // Generate PDF
    const pdfBuffer = await generateTicketPDF({ booking, ticket });
    // Upload to S3
    const bucket = process.env.TICKET_BUCKET || 'private-ticket-bucket';
    const key = `tickets/${booking.booking_number}/${ticket.ticket_id}.pdf`;
    await uploadBuffer(bucket, key, pdfBuffer, 'application/pdf', 'private');
    const s3Url = `https://${bucket}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${key}`;

    // Create notification logs
    const emailLogId = await db.createNotificationLog({ booking_id: booking.booking_id, type: 'ticket', provider: 'email', recipient: user.email });
    const waLogId = await db.createNotificationLog({ booking_id: booking.booking_id, type: 'ticket', provider: 'whatsapp', recipient: user.phone });

    // Send email with PDF attachment
    try {
      await sendEmail({
        to: user.email,
        subject: `Your ticket for ${booking.event_title || 'Buizz event'}`,
        html: `<p>Your booking is confirmed. Download your ticket <a href=\"${s3Url}\">here</a>.</p>`,
        attachments: [{ filename: 'ticket.pdf', content: pdfBuffer }]
      });
      await db.updateNotificationLog(emailLogId, { status: 'sent' });
    } catch (err) {
      await db.updateNotificationLog(emailLogId, { status: 'failed', error: err.message });
    }

    // Send WhatsApp message (template)
    try {
      const templateName = process.env.TEMPLATE_TICKET || 'ticket_confirmation';
      await sendTemplateMessage({
        to: user.phone,
        templateName,
        components: [
          { type: 'body', parameters: [ { type: 'text', text: booking.event_title || 'Event' }, { type: 'text', text: s3Url } ] }
        ]
      });
      await db.updateNotificationLog(waLogId, { status: 'sent' });
    } catch (err) {
      await db.updateNotificationLog(waLogId, { status: 'failed', error: err.message });
    }

    return { success: true };
  }

  if (name === 'otp') {
    // send OTP via WhatsApp template + email
    const { otp, user, purpose } = data;
    const phone = user.phone;
    const email = user.email;
    const tpl = process.env.TEMPLATE_OTP || 'otp_verification';

    if (phone) {
      const waLogId = await db.createNotificationLog({ booking_id: null, type: 'otp', provider: 'whatsapp', recipient: phone });
      try {
        await sendTemplateMessage({ to: phone, templateName: tpl, components: [ { type: 'body', parameters: [ { type: 'text', text: otp } ] } ] });
        await db.updateNotificationLog(waLogId, { status: 'sent' });
      } catch (err) {
        await db.updateNotificationLog(waLogId, { status: 'failed', error: err.message });
      }
    }

    if (email) {
      const emailLogId = await db.createNotificationLog({ booking_id: null, type: 'otp', provider: 'email', recipient: email });
      try {
        await sendEmail({ to: email, subject: 'Your OTP', text: `Your OTP is ${otp}`, html: `<p>Your OTP is <strong>${otp}</strong></p>` });
        await db.updateNotificationLog(emailLogId, { status: 'sent' });
      } catch (err) {
        await db.updateNotificationLog(emailLogId, { status: 'failed', error: err.message });
      }
    }

    return { success: true };
  }

  return { skipped: true };
}, { connection, concurrency: 5 });

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});
worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed`, err);
});

module.exports = worker;
