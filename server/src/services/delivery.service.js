const logger = require('../utils/logger');
const whatsappService = require('./whatsapp.service');
const { sendEmail, sendTicketPdfEmail } = require('../utils/email');

const buildResult = () => ({
  whatsapp: { attempted: false, sent: false, skipped: false, reason: null, error: null },
  email: { attempted: false, sent: false, skipped: false, reason: null, error: null },
  channel: null,
});

const markEmailResult = (delivery, result) => {
  if (result && !result.skipped) {
    delivery.email.sent = true;
    delivery.channel = delivery.channel || 'email';
    delivery.email.messageId = result.messageId || null;
    return;
  }
  delivery.email.skipped = true;
  delivery.email.reason = result?.reason || 'EMAIL_SKIPPED';
  delivery.email.error = result?.error || null;
};

const sendPhoneOtpWithEmailFallback = async ({
  phone,
  email,
  otp,
  name = 'Buizz user',
  preferredChannel = 'auto',
}) => {
  const delivery = buildResult();

  const shouldTryWhatsApp = preferredChannel !== 'email';

  if (shouldTryWhatsApp && phone && whatsappService.isConfigured()) {
    delivery.whatsapp.attempted = true;
    try {
      await whatsappService.sendOtp(phone, otp);
      delivery.whatsapp.sent = true;
      delivery.channel = 'whatsapp';
      return delivery;
    } catch (error) {
      delivery.whatsapp.skipped = true;
      delivery.whatsapp.reason = 'WHATSAPP_FAILED';
      delivery.whatsapp.error = error.response?.data?.error?.message || error.message;
      logger.warn('WhatsApp OTP failed, falling back to email', { phone, error: delivery.whatsapp.error });
    }
  } else if (shouldTryWhatsApp) {
    delivery.whatsapp.skipped = true;
    delivery.whatsapp.reason = whatsappService.isConfigured() ? 'PHONE_MISSING' : 'WHATSAPP_NOT_CONFIGURED';
  } else {
    delivery.whatsapp.skipped = true;
    delivery.whatsapp.reason = 'EMAIL_SELECTED';
  }

  if (!email) {
    delivery.email.skipped = true;
    delivery.email.reason = 'EMAIL_MISSING';
    return delivery;
  }

  delivery.email.attempted = true;
  const emailResult = await sendEmail({
    to: email,
    subject: 'Your Buizz phone verification code',
    text: `Hi ${name},\n\nYour Buizz phone verification code is ${otp}. This code expires in 10 minutes. Do not share it with anyone.`,
    html: `<p>Hi ${name},</p><p>Your Buizz phone verification code is:</p><h2 style="font-size:32px;letter-spacing:8px;margin:16px 0">${otp}</h2><p>This code expires in 10 minutes. Do not share it with anyone.</p>`,
  });
  markEmailResult(delivery, emailResult);
  return delivery;
};

const sendTicketWithFallback = async ({ phone, emailPayload, whatsappPayload }) => {
  const delivery = buildResult();

  if (phone && whatsappService.isConfigured()) {
    delivery.whatsapp.attempted = true;
    try {
      await whatsappService.sendBookingConfirmation(phone, whatsappPayload);
      delivery.whatsapp.sent = true;
      delivery.channel = 'whatsapp';
      return delivery;
    } catch (error) {
      delivery.whatsapp.skipped = true;
      delivery.whatsapp.reason = 'WHATSAPP_FAILED';
      delivery.whatsapp.error = error.response?.data?.error?.message || error.message;
      logger.warn('WhatsApp ticket delivery failed, falling back to email', {
        orderId: whatsappPayload?.orderId,
        error: delivery.whatsapp.error,
      });
    }
  } else {
    delivery.whatsapp.skipped = true;
    delivery.whatsapp.reason = whatsappService.isConfigured() ? 'PHONE_MISSING' : 'WHATSAPP_NOT_CONFIGURED';
  }

  if (!emailPayload?.to) {
    delivery.email.skipped = true;
    delivery.email.reason = 'EMAIL_MISSING';
    return delivery;
  }

  delivery.email.attempted = true;
  const emailResult = await sendTicketPdfEmail(emailPayload);
  markEmailResult(delivery, emailResult);
  return delivery;
};

const sendPaymentConfirmationWithFallback = async ({ phone, email, details }) => {
  const delivery = buildResult();

  if (phone && whatsappService.isConfigured()) {
    delivery.whatsapp.attempted = true;
    try {
      await whatsappService.sendPaymentConfirmation(phone, details);
      delivery.whatsapp.sent = true;
      delivery.channel = 'whatsapp';
      return delivery;
    } catch (error) {
      delivery.whatsapp.skipped = true;
      delivery.whatsapp.reason = 'WHATSAPP_FAILED';
      delivery.whatsapp.error = error.response?.data?.error?.message || error.message;
      logger.warn('WhatsApp payment confirmation failed, falling back to email', {
        orderId: details?.orderId,
        error: delivery.whatsapp.error,
      });
    }
  } else {
    delivery.whatsapp.skipped = true;
    delivery.whatsapp.reason = whatsappService.isConfigured() ? 'PHONE_MISSING' : 'WHATSAPP_NOT_CONFIGURED';
  }

  if (!email) {
    delivery.email.skipped = true;
    delivery.email.reason = 'EMAIL_MISSING';
    return delivery;
  }

  delivery.email.attempted = true;
  const emailResult = await sendEmail({
    to: email,
    subject: `Payment confirmed - ${details?.eventName || 'Buizz booking'}`,
    text: `Your payment is confirmed.\n\nEvent: ${details?.eventName || 'Buizz booking'}\nAmount: ${details?.amountPaid || 'Paid'}\nOrder ID: ${details?.orderId || 'N/A'}`,
    html: `<p>Your payment is confirmed.</p><p><strong>Event:</strong> ${details?.eventName || 'Buizz booking'}</p><p><strong>Amount:</strong> ${details?.amountPaid || 'Paid'}</p><p><strong>Order ID:</strong> ${details?.orderId || 'N/A'}</p>`,
  });
  markEmailResult(delivery, emailResult);
  return delivery;
};

module.exports = {
  sendPhoneOtpWithEmailFallback,
  sendTicketWithFallback,
  sendPaymentConfirmationWithFallback,
};
