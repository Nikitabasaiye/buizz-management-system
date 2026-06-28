const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const WHATSAPP_CONFIG = {
  apiUrl: process.env.META_WHATSAPP_API_URL || 'https://graph.facebook.com/v23.0',
  accessToken: process.env.META_WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.META_WHATSAPP_PHONE_NUMBER_ID,
  businessAccountId: process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID,
  publicBaseUrl: process.env.WHATSAPP_PUBLIC_BASE_URL || process.env.BACKEND_URL,
};

const QR_STORAGE_DIR = path.join(__dirname, '..', '..', 'storage', 'qrcodes');

const formatDateTime = (value) => {
  if (!value) return 'TBD';
  return new Date(value).toLocaleString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const formatMoney = (value, currency = 'INR') => {
  const amount = Number(value || 0).toLocaleString('en-IN');
  return currency === 'INR' ? `Rs. ${amount}` : `${currency} ${amount}`;
};

class WhatsAppService {
  async _post(endpoint, payload) {
    const url = `${WHATSAPP_CONFIG.apiUrl}/${endpoint}`;
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_CONFIG.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  }

  _normalizePhone(phone) {
    return String(phone || '').replace(/\D/g, '');
  }

  _messageEndpoint() {
    return `${WHATSAPP_CONFIG.phoneNumberId}/messages`;
  }

  _assertConfigured() {
    if (!this.isConfigured()) {
      throw new Error('WhatsApp Business API is not configured. Set META_WHATSAPP_ACCESS_TOKEN and META_WHATSAPP_PHONE_NUMBER_ID.');
    }
  }

  _ticketViewUrl(ticketNumber) {
    const baseUrl = process.env.FRONTEND_URL || WHATSAPP_CONFIG.publicBaseUrl;
    return baseUrl ? `${baseUrl.replace(/\/$/, '')}/tickets/${ticketNumber}` : '';
  }

  _persistQrCode(ticketNumber, qrCodeDataUrl) {
    if (!qrCodeDataUrl || !qrCodeDataUrl.startsWith('data:image/')) return null;
    if (!WHATSAPP_CONFIG.publicBaseUrl) return null;

    const match = qrCodeDataUrl.match(/^data:image\/png;base64,(.+)$/);
    if (!match) return null;

    fs.mkdirSync(QR_STORAGE_DIR, { recursive: true });
    const safeTicketNumber = String(ticketNumber).replace(/[^a-zA-Z0-9_-]/g, '');
    const fileName = `${safeTicketNumber}.png`;
    fs.writeFileSync(path.join(QR_STORAGE_DIR, fileName), Buffer.from(match[1], 'base64'));

    return `${WHATSAPP_CONFIG.publicBaseUrl.replace(/\/$/, '')}/storage/qrcodes/${fileName}`;
  }

  _buildBookingText(details) {
    const ticketNumbers = details.tickets?.length
      ? details.tickets.map((ticket) => ticket.ticketNumber || ticket.ticket_number).filter(Boolean).join(', ')
      : details.ticketNumber;

    return [
      `Hi ${details.userName || 'there'}, your Buizz booking is confirmed.`,
      '',
      `Event: ${details.eventName || 'Event'}`,
      `Date & Time: ${details.eventDate || 'TBD'}`,
      `Venue: ${details.eventVenue || 'TBD'}`,
      `Ticket Type: ${details.ticketType || 'General'}`,
      `Quantity: ${details.quantity || details.tickets?.length || 1}`,
      `Ticket No: ${ticketNumbers || 'N/A'}`,
      `Amount Paid: ${details.amountPaid || 'N/A'}`,
      `Order ID: ${details.orderId || 'N/A'}`,
      `Transaction ID: ${details.transactionId || 'N/A'}`,
      '',
      details.ticketNumber ? `View ticket: ${this._ticketViewUrl(details.ticketNumber)}` : null,
      'Please show the QR code at the venue entrance.',
    ].filter(Boolean).join('\n');
  }

  _buildReminderText(details) {
    return [
      `Reminder: ${details.eventName || 'Your event'} is coming up.`,
      '',
      `Date & Time: ${details.eventDate || 'TBD'}`,
      `Venue: ${details.eventVenue || 'TBD'}`,
      details.ticketNumber ? `Ticket No: ${details.ticketNumber}` : null,
      details.orderId ? `Order ID: ${details.orderId}` : null,
      '',
      'Please keep your ticket QR code ready for entry.',
    ].filter(Boolean).join('\n');
  }

  async createBookingConfirmationTemplate() {
    this._assertConfigured();

    const payload = {
      name: 'booking_confirmation',
      language: 'en_US',
      category: 'UTILITY',
      components: [
        {
          type: 'BODY',
          text: 'Hi {{1}}, your booking for {{2}} is confirmed. Date: {{3}}. Venue: {{4}}. Ticket: {{5}}. Amount: {{6}}. Order: {{7}}.',
          example: {
            body_text: [[
              'Rahul Sharma',
              'Tech Summit 2026',
              'Saturday, 15 June 2026 at 10:00 AM',
              'NSCI Dome, Mumbai',
              'TKT17031234567890',
              'Rs. 2000',
              'ORD1703123456789',
            ]],
          },
        },
      ],
    };

    const data = await this._post(`${WHATSAPP_CONFIG.businessAccountId}/message_templates`, payload);
    logger.info('WhatsApp booking template submitted', { templateId: data.id, status: data.status });
    return data;
  }

  async createEventReminderTemplate() {
    this._assertConfigured();

    const payload = {
      name: 'event_reminder',
      language: 'en_US',
      category: 'UTILITY',
      components: [
        {
          type: 'BODY',
          text: 'Reminder: {{1}} is coming up on {{2}} at {{3}}. Ticket: {{4}}. Please keep your QR code ready for entry.',
          example: {
            body_text: [[
              'Tech Summit 2026',
              'Saturday, 15 June 2026 at 10:00 AM',
              'NSCI Dome, Mumbai',
              'TKT17031234567890',
            ]],
          },
        },
      ],
    };

    const data = await this._post(`${WHATSAPP_CONFIG.businessAccountId}/message_templates`, payload);
    logger.info('WhatsApp reminder template submitted', { templateId: data.id, status: data.status });
    return data;
  }

  async sendTemplateMessage(phoneNumber, templateName, parameters = []) {
    this._assertConfigured();

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this._normalizePhone(phoneNumber),
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en_US' },
        components: [
          {
            type: 'body',
            parameters: parameters.map((text) => ({ type: 'text', text: String(text || 'N/A') })),
          },
        ],
      },
    };

    const data = await this._post(this._messageEndpoint(), payload);
    return { success: true, messageId: data.messages?.[0]?.id };
  }

  async sendTextMessage(phoneNumber, text) {
    this._assertConfigured();

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this._normalizePhone(phoneNumber),
      type: 'text',
      text: { preview_url: true, body: text },
    };

    const data = await this._post(this._messageEndpoint(), payload);
    return { success: true, messageId: data.messages?.[0]?.id };
  }

  async sendImageMessage(phoneNumber, imageUrl, caption = '') {
    this._assertConfigured();

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this._normalizePhone(phoneNumber),
      type: 'image',
      image: { link: imageUrl, caption },
    };

    const data = await this._post(this._messageEndpoint(), payload);
    return { success: true, messageId: data.messages?.[0]?.id };
  }

  async sendTicketQr(phoneNumber, ticket) {
    const ticketNumber = ticket.ticketNumber || ticket.ticket_number;
    const qrUrl = ticket.qrUrl || this._persistQrCode(ticketNumber, ticket.qrCode || ticket.qr_code);

    if (!qrUrl) {
      logger.warn('Ticket QR image skipped because no public QR URL is available', { ticketNumber });
      return { skipped: true, reason: 'qr_url_unavailable' };
    }

    return this.sendImageMessage(
      phoneNumber,
      qrUrl,
      `Ticket QR: ${ticketNumber}. Show this at the venue entrance.`
    );
  }

  async sendBookingConfirmation(phoneNumber, bookingDetails) {
    const details = {
      ...bookingDetails,
      eventDate: bookingDetails.eventDate || formatDateTime(bookingDetails.event_date),
      amountPaid: bookingDetails.amountPaid || formatMoney(bookingDetails.amount),
    };

    const results = [];

    try {
      const templateResult = await this.sendTemplateMessage(phoneNumber, 'booking_confirmation', [
        details.userName,
        details.eventName,
        details.eventDate,
        details.eventVenue,
        details.ticketNumber,
        details.amountPaid,
        details.orderId,
      ]);
      results.push({ type: 'template', ...templateResult });
    } catch (error) {
      logger.warn('WhatsApp booking template failed, falling back to text message', {
        phoneNumber,
        error: error.response?.data?.error?.message || error.message,
      });
      const textResult = await this.sendTextMessage(phoneNumber, this._buildBookingText(details));
      results.push({ type: 'text', ...textResult });
    }

    const tickets = details.tickets?.length
      ? details.tickets
      : details.ticketNumber
        ? [{ ticketNumber: details.ticketNumber, qrCode: details.qrCode }]
        : [];

    for (const ticket of tickets) {
      const qrResult = await this.sendTicketQr(phoneNumber, ticket).catch((error) => {
        logger.error('WhatsApp ticket QR send failed', {
          ticketNumber: ticket.ticketNumber || ticket.ticket_number,
          error: error.response?.data || error.message,
        });
        return { success: false, error: error.message };
      });
      results.push({ type: 'ticket_qr', ticketNumber: ticket.ticketNumber || ticket.ticket_number, ...qrResult });
    }

    logger.info('WhatsApp booking confirmation processed', {
      phoneNumber,
      orderId: details.orderId,
      messageCount: results.length,
    });

    return { success: true, results, messageId: results.find((result) => result.messageId)?.messageId };
  }

  async sendTicketDetails(phoneNumber, ticket) {
    const eventDate = formatDateTime(ticket.event_date || ticket.eventDate);
    const venue = [ticket.venue_name, ticket.venue_address].filter(Boolean).join(', ') || ticket.eventVenue || 'TBD';
    const text = this._buildBookingText({
      userName: ticket.user_name || ticket.userName,
      eventName: ticket.event_title || ticket.eventName,
      eventDate,
      eventVenue: venue,
      ticketType: ticket.ticket_type || ticket.ticketType,
      quantity: 1,
      ticketNumber: ticket.ticket_number || ticket.ticketNumber,
      amountPaid: formatMoney(ticket.price),
      orderId: ticket.order_id || ticket.orderId,
      transactionId: ticket.transaction_id || ticket.transactionId,
      qrCode: ticket.qr_code || ticket.qrCode,
    });

    const textResult = await this.sendTextMessage(phoneNumber, text);
    const qrResult = await this.sendTicketQr(phoneNumber, ticket);
    return { success: true, results: [{ type: 'text', ...textResult }, { type: 'ticket_qr', ...qrResult }] };
  }

  async sendEventReminder(phoneNumber, reminderDetails) {
    const details = {
      ...reminderDetails,
      eventDate: reminderDetails.eventDate || formatDateTime(reminderDetails.event_date),
    };

    try {
      return await this.sendTemplateMessage(phoneNumber, 'event_reminder', [
        details.eventName,
        details.eventDate,
        details.eventVenue,
        details.ticketNumber,
      ]);
    } catch (error) {
      logger.warn('WhatsApp reminder template failed, falling back to text message', {
        phoneNumber,
        error: error.response?.data?.error?.message || error.message,
      });
      return this.sendTextMessage(phoneNumber, this._buildReminderText(details));
    }
  }

  isConfigured() {
    return !!(
      WHATSAPP_CONFIG.accessToken &&
      WHATSAPP_CONFIG.phoneNumberId &&
      !String(WHATSAPP_CONFIG.phoneNumberId).startsWith('your-')
    );
  }

  getStatus() {
    return {
      configured: this.isConfigured(),
      hasAccessToken: Boolean(WHATSAPP_CONFIG.accessToken && !String(WHATSAPP_CONFIG.accessToken).startsWith('your-')),
      hasPhoneNumberId: Boolean(WHATSAPP_CONFIG.phoneNumberId && !String(WHATSAPP_CONFIG.phoneNumberId).startsWith('your-')),
      hasBusinessAccountId: Boolean(WHATSAPP_CONFIG.businessAccountId && !String(WHATSAPP_CONFIG.businessAccountId).startsWith('your-')),
      hasPublicBaseUrl: Boolean(WHATSAPP_CONFIG.publicBaseUrl),
      publicBaseUrl: WHATSAPP_CONFIG.publicBaseUrl || null,
    };
  }
}

module.exports = new WhatsAppService();
