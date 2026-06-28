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
  if (!hasSmtpConfig() && process.env.NODE_ENV === 'development') {
    logger.warn(`Email skipped in development because SMTP is not configured. Subject: ${subject}, to: ${to}`);
    return { skipped: true };
  }

  const transporter = createTransporter();
  const message = {
    from: from || `Buizz <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html
  };

  const info = await transporter.sendMail(message);
  logger.info(`Email sent: ${info.messageId} to ${to}`);
  return info;
};

module.exports = { sendEmail };
