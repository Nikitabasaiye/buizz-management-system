const nodemailer = require('nodemailer');
const { getParameter } = require('./ssm');

let transporter;

async function createTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || await getParameter('/buizz/prod/server/SMTP_HOST');
  const port = process.env.SMTP_PORT || await getParameter('/buizz/prod/server/SMTP_PORT');
  const user = process.env.SMTP_USER || await getParameter('/buizz/prod/server/SMTP_USER');
  const pass = process.env.SMTP_PASS || await getParameter('/buizz/prod/server/SMTP_PASS');
  const secure = (process.env.SMTP_SECURE === 'true') || (port == 465);

  if (!host || !port || !user || !pass) {
    throw new Error('SMTP credentials not configured');
  }

  transporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: !!secure,
    auth: { user, pass },
  });

  return transporter;
}

async function sendEmail({ to, subject, html, text, attachments = [] }) {
  const t = await createTransporter();
  const info = await t.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@buizz.com',
    to,
    subject,
    html,
    text,
    attachments,
  });
  return info;
}

module.exports = { createTransporter, sendEmail };
