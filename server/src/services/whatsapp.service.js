const axios = require('axios');
const logger = require('../utils/logger');

const graphVersion = process.env.WHATSAPP_API_VERSION || process.env.META_GRAPH_VERSION || 'v25.0';
const graphBaseUrl = process.env.META_GRAPH_BASE_URL || `https://graph.facebook.com/${graphVersion}`;

const config = {
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_WHATSAPP_PHONE_NUMBER_ID,
  otpTemplateName: process.env.WHATSAPP_OTP_TEMPLATE_NAME || process.env.META_WHATSAPP_OTP_TEMPLATE_NAME,
  ticketTemplateName: process.env.WHATSAPP_TICKET_TEMPLATE_NAME || process.env.META_WHATSAPP_TICKET_TEMPLATE_NAME,
  paymentTemplateName: process.env.WHATSAPP_PAYMENT_TEMPLATE_NAME || process.env.META_WHATSAPP_PAYMENT_TEMPLATE_NAME,
  languageCode: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en_US',
};

const normalizePhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `91${digits}`;
  return digits;
};

const compact = (value, fallback = 'N/A') => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

class MetaWhatsAppService {
  isConfigured() {
    return Boolean(config.accessToken && config.phoneNumberId);
  }

  getStatus() {
    return {
      provider: 'meta_whatsapp_cloud_api',
      configured: this.isConfigured(),
      phoneNumberIdConfigured: Boolean(config.phoneNumberId),
      accessTokenConfigured: Boolean(config.accessToken),
      otpTemplateConfigured: Boolean(config.otpTemplateName),
      ticketTemplateConfigured: Boolean(config.ticketTemplateName),
      paymentTemplateConfigured: Boolean(config.paymentTemplateName),
      graphVersion,
    };
  }

  async _request(payload) {
    if (!this.isConfigured()) {
      const error = new Error('Meta WhatsApp API is not configured');
      error.code = 'WHATSAPP_NOT_CONFIGURED';
      throw error;
    }

    const url = `${graphBaseUrl}/${config.phoneNumberId}/messages`;

    try {
      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });
      return response.data;
    } catch (error) {
      logger.error('Meta WhatsApp API request failed', {
        status: error.response?.status,
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  async sendTextMessage(phoneNumber, message) {
    const to = normalizePhone(phoneNumber);
    if (!to) throw new Error('Valid WhatsApp phone number is required');

    return this._request({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        preview_url: false,
        body: String(message || '').slice(0, 4096),
      },
    });
  }

  async sendTemplateMessage(phoneNumber, templateName, bodyValues = [], extraComponents = []) {
    const to = normalizePhone(phoneNumber);
    if (!to) throw new Error('Valid WhatsApp phone number is required');
    if (!templateName) throw new Error('WhatsApp template name is required');

    const components = [];
    if (bodyValues.length) {
      components.push({
        type: 'body',
        parameters: bodyValues.map((value) => ({
          type: 'text',
          text: compact(value),
        })),
      });
    }
    components.push(...extraComponents);

    return this._request({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: config.languageCode },
        ...(components.length ? { components } : {}),
      },
    });
  }

  async sendOtp(phoneNumber, otp) {
    if (config.otpTemplateName) {
      return this.sendTemplateMessage(phoneNumber, config.otpTemplateName, [otp]);
    }

    return this.sendTextMessage(
      phoneNumber,
      `Your Buizz OTP is ${otp}. This code expires in 10 minutes. Do not share it with anyone.`
    );
  }

  async sendBookingConfirmation(phoneNumber, details = {}) {
    const ticketLink = details.ticketUrl || details.ticketPdfUrl || details.bookingUrl || '';
    const bodyValues = [
      details.userName || 'Customer',
      details.eventName,
      details.eventDate,
      details.eventVenue,
      details.ticketNumber,
      details.amountPaid,
      ticketLink || details.orderId,
    ];

    if (config.ticketTemplateName) {
      return this.sendTemplateMessage(phoneNumber, config.ticketTemplateName, bodyValues);
    }

    return this.sendTextMessage(
      phoneNumber,
      [
        `Hi ${compact(details.userName, 'Customer')}, your Buizz booking is confirmed.`,
        `Event: ${compact(details.eventName)}`,
        `Date: ${compact(details.eventDate)}`,
        `Venue: ${compact(details.eventVenue)}`,
        `Ticket: ${compact(details.ticketNumber)}`,
        `Amount Paid: ${compact(details.amountPaid)}`,
        ticketLink ? `Ticket/PDF: ${ticketLink}` : `Order ID: ${compact(details.orderId)}`,
        'Please show your QR ticket at gate entry.',
      ].join('\n')
    );
  }

  async sendTicketDetails(phoneNumber, ticket = {}) {
    return this.sendBookingConfirmation(phoneNumber, {
      userName: ticket.userName || ticket.customerName,
      eventName: ticket.eventName,
      eventDate: ticket.eventDate,
      eventVenue: ticket.eventVenue,
      ticketNumber: ticket.ticketNumber || ticket.ticket_number,
      amountPaid: ticket.amountPaid || ticket.amount,
      orderId: ticket.orderId,
      ticketUrl: ticket.ticketUrl,
      ticketPdfUrl: ticket.ticketPdfUrl,
    });
  }

  async sendPaymentConfirmation(phoneNumber, details = {}) {
    if (config.paymentTemplateName) {
      return this.sendTemplateMessage(phoneNumber, config.paymentTemplateName, [
        details.userName || 'Customer',
        details.eventName,
        details.amountPaid,
        details.orderId,
      ]);
    }

    return this.sendTextMessage(
      phoneNumber,
      [
        `Payment confirmed for ${compact(details.eventName, 'your Buizz booking')}.`,
        `Amount: ${compact(details.amountPaid)}`,
        `Order ID: ${compact(details.orderId)}`,
        'Your ticket will be delivered shortly.',
      ].join('\n')
    );
  }

  async sendEventReminder(phoneNumber, details = {}) {
    return this.sendTextMessage(
      phoneNumber,
      `Reminder: ${compact(details.eventName)} is scheduled on ${compact(details.eventDate)} at ${compact(details.eventVenue)}. Keep your Buizz QR ticket ready.`
    );
  }

  async createBookingConfirmationTemplate() {
    return { skipped: true, reason: 'Create templates from Meta WhatsApp Manager and set WHATSAPP_TICKET_TEMPLATE_NAME' };
  }

  async createEventReminderTemplate() {
    return { skipped: true, reason: 'Create templates from Meta WhatsApp Manager and set the template env var' };
  }
}

module.exports = new MetaWhatsAppService();
