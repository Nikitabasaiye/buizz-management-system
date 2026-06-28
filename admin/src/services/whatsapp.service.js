const axios = require('axios');
const logger = require('../utils/logger');

const WHATSAPP_CONFIG = {
  apiUrl: process.env.META_WHATSAPP_API_URL || 'https://graph.facebook.com/v23.0',
  accessToken: process.env.META_WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.META_WHATSAPP_PHONE_NUMBER_ID,
  businessAccountId: process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID,
};

class WhatsAppService {
  // ─── Private: base API caller ────────────────────────────────────────────────
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

  // ─── Normalize phone: strip non-digits, ensure country code ─────────────────
  _normalizePhone(phone) {
    return phone.replace(/\D/g, '');
  }

  // ─── Create the booking_confirmation template via Meta API ───────────────────
  // Call this ONCE to register the template. After approval, use sendBookingConfirmation.
  async createBookingConfirmationTemplate() {
    const payload = {
      name: 'booking_confirmation',
      language: 'en_US',
      category: 'utility',
      parameter_format: 'named',
      components: [
        {
          type: 'header',
          format: 'text',
          text: '🎉 Booking Confirmed – {{event_name}}',
          example: {
            header_text: ['Tech Summit 2025'],
          },
        },
        {
          type: 'body',
          text:
            'Hi {{user_name}},\n\nYour booking is confirmed! Here are your details:\n\n' +
            '📋 *Ticket Number:* {{ticket_number}}\n' +
            '🎪 *Event:* {{event_name}}\n' +
            '📅 *Date & Time:* {{event_date}}\n' +
            '📍 *Venue:* {{event_venue}}\n' +
            '🎫 *Ticket Type:* {{ticket_type}}\n' +
            '🔢 *Quantity:* {{quantity}}\n' +
            '💰 *Amount Paid:* {{amount_paid}}\n' +
            '🆔 *Order ID:* {{order_id}}\n' +
            '💳 *Transaction ID:* {{transaction_id}}\n\n' +
            'Please show this message or your QR code at the venue entrance.\n\n' +
            'Thank you for booking with Buizz! 🚀',
          example: {
            body_text_named_params: [
              { param_name: 'user_name', example: 'Rahul Sharma' },
              { param_name: 'ticket_number', example: 'TKT17031234567890' },
              { param_name: 'event_name', example: 'Tech Summit 2025' },
              { param_name: 'event_date', example: 'Saturday, March 15, 2025 at 10:00 AM' },
              { param_name: 'event_venue', example: 'NSCI Dome, Mumbai' },
              { param_name: 'ticket_type', example: 'VIP' },
              { param_name: 'quantity', example: '2' },
              { param_name: 'amount_paid', example: '₹2,000' },
              { param_name: 'order_id', example: 'ORD1703123456789' },
              { param_name: 'transaction_id', example: 'T2312251234567890' },
            ],
          },
        },
        {
          type: 'footer',
          text: 'Buizz – Discover & Book Amazing Events',
        },
        {
          type: 'buttons',
          buttons: [
            {
              type: 'url',
              text: 'View Ticket',
              url: `${process.env.FRONTEND_URL}/bookings/{{order_id}}`,
            },
            {
              type: 'quick_reply',
              text: 'Need Help?',
            },
          ],
        },
      ],
    };

    try {
      const data = await this._post(
        `${WHATSAPP_CONFIG.businessAccountId}/message_templates`,
        payload
      );
      logger.info('WhatsApp template created', { templateId: data.id, status: data.status });
      return data;
    } catch (error) {
      logger.error('WhatsApp template creation failed', {
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  // ─── Send booking confirmation after successful payment ──────────────────────
  async sendBookingConfirmation(phoneNumber, bookingDetails) {
    const {
      userName,
      ticketNumber,
      eventName,
      eventDate,
      eventVenue,
      ticketType,
      quantity,
      amountPaid,
      orderId,
      transactionId,
    } = bookingDetails;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this._normalizePhone(phoneNumber),
      type: 'template',
      template: {
        name: 'booking_confirmation',
        language: { code: 'en_US' },
        components: [
          // Header – event name
          {
            type: 'header',
            parameters: [
              {
                type: 'text',
                parameter_name: 'event_name',
                text: eventName,
              },
            ],
          },
          // Body – all booking details as named params
          {
            type: 'body',
            parameters: [
              { type: 'text', parameter_name: 'user_name',      text: userName },
              { type: 'text', parameter_name: 'ticket_number',  text: ticketNumber },
              { type: 'text', parameter_name: 'event_name',     text: eventName },
              { type: 'text', parameter_name: 'event_date',     text: eventDate },
              { type: 'text', parameter_name: 'event_venue',    text: eventVenue },
              { type: 'text', parameter_name: 'ticket_type',    text: ticketType },
              { type: 'text', parameter_name: 'quantity',       text: String(quantity) },
              { type: 'text', parameter_name: 'amount_paid',    text: amountPaid },
              { type: 'text', parameter_name: 'order_id',       text: orderId },
              { type: 'text', parameter_name: 'transaction_id', text: transactionId },
            ],
          },
        ],
      },
    };

    try {
      const data = await this._post(
        `${WHATSAPP_CONFIG.phoneNumberId}/messages`,
        payload
      );

      const messageId = data.messages?.[0]?.id;
      logger.info('WhatsApp booking confirmation sent', {
        phoneNumber,
        ticketNumber,
        orderId,
        messageId,
      });

      return { success: true, messageId };
    } catch (error) {
      const apiError = error.response?.data?.error;
      logger.error('WhatsApp booking confirmation failed', {
        phoneNumber,
        orderId,
        errorCode: apiError?.code,
        errorMessage: apiError?.message || error.message,
      });
      throw error;
    }
  }

  // ─── Send a plain text message ───────────────────────────────────────────────
  async sendTextMessage(phoneNumber, text) {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this._normalizePhone(phoneNumber),
      type: 'text',
      text: { body: text },
    };

    try {
      const data = await this._post(`${WHATSAPP_CONFIG.phoneNumberId}/messages`, payload);
      return { success: true, messageId: data.messages?.[0]?.id };
    } catch (error) {
      logger.error('WhatsApp text message failed', {
        phoneNumber,
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  // ─── Send an image message (e.g. QR code) ───────────────────────────────────
  async sendImageMessage(phoneNumber, imageUrl, caption = '') {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this._normalizePhone(phoneNumber),
      type: 'image',
      image: { link: imageUrl, caption },
    };

    try {
      const data = await this._post(`${WHATSAPP_CONFIG.phoneNumberId}/messages`, payload);
      return { success: true, messageId: data.messages?.[0]?.id };
    } catch (error) {
      logger.error('WhatsApp image message failed', {
        phoneNumber,
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  // ─── Check if config is ready ────────────────────────────────────────────────
  isConfigured() {
    return !!(
      WHATSAPP_CONFIG.accessToken &&
      WHATSAPP_CONFIG.phoneNumberId &&
      WHATSAPP_CONFIG.businessAccountId
    );
  }
}

module.exports = new WhatsAppService();
