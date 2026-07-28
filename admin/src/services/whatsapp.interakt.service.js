const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Interakt WhatsApp API Service (Admin)
 * Documentation: https://www.interakt.shop/resource-center/interakt-apis-and-webhooks-an-overview/
 */

const INTERAKT_CONFIG = {
  apiUrl: process.env.INTERAKT_API_URL || 'https://api.interakt.ai/v1',
  apiKey: process.env.INTERAKT_API_KEY,
  phoneNumberId: process.env.INTERAKT_PHONE_NUMBER_ID,
};

class InteraktWhatsAppService {
  async _request(method, endpoint, data = null) {
    const url = `${INTERAKT_CONFIG.apiUrl}${endpoint}`;
    
    const config = {
      method,
      url,
      headers: {
        'Authorization': `Basic ${INTERAKT_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      config.data = data;
    }

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      logger.error('Interakt API request failed', {
        endpoint,
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  _normalizePhone(phone) {
    let normalized = phone.replace(/\D/g, '');
    if (normalized.length === 10) {
      normalized = '91' + normalized;
    }
    return normalized;
  }

  async trackUser(phoneNumber, userData = {}) {
    const payload = {
      phoneNumber: this._normalizePhone(phoneNumber),
      countryCode: '+91',
      traits: userData.traits || {},
      tags: userData.tags || [],
    };

    return this._request('POST', '/track/users/', payload);
  }

  async trackEvent(phoneNumber, eventName, eventData = {}) {
    const payload = {
      phoneNumber: this._normalizePhone(phoneNumber),
      countryCode: '+91',
      event: eventName,
      traits: eventData,
    };

    return this._request('POST', '/track/events/', payload);
  }

  async sendTemplateMessage(phoneNumber, templateName, templateData = {}) {
    const payload = {
      countryCode: '+91',
      phoneNumber: this._normalizePhone(phoneNumber),
      callbackData: 'Buizz Notification',
      type: 'Template',
      template: {
        name: templateName,
        languageCode: 'en',
        bodyValues: templateData.bodyValues || [],
      },
    };

    return this._request('POST', '/track/events/', payload);
  }

  async sendTextMessage(phoneNumber, text) {
    // Interakt doesn't have direct text message API
    // Use event tracking to trigger a campaign
    return this.trackEvent(phoneNumber, 'text_message_sent', { message: text });
  }

  async sendImageMessage(phoneNumber, imageUrl, caption = '') {
    // Track event with media URL
    return this.trackEvent(phoneNumber, 'image_sent', {
      image_url: imageUrl,
      caption,
    });
  }

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

    // Track user first
    await this.trackUser(phoneNumber, {
      traits: {
        name: userName,
        last_booking: new Date().toISOString(),
      },
    });

    // Track booking event
    const response = await this.trackEvent(phoneNumber, 'booking_confirmed', {
      ticket_number: ticketNumber,
      event_name: eventName,
      event_date: eventDate,
      event_venue: eventVenue,
      ticket_type: ticketType,
      quantity: String(quantity),
      amount_paid: amountPaid,
      order_id: orderId,
      transaction_id: transactionId,
    });

    logger.info('Interakt booking confirmation sent', {
      phoneNumber,
      orderId,
    });

    return { success: true, messageId: response.eventId };
  }

  isConfigured() {
    return !!(INTERAKT_CONFIG.apiKey && !String(INTERAKT_CONFIG.apiKey).startsWith('your-'));
  }

  getStatus() {
    return {
      provider: 'Interakt',
      configured: this.isConfigured(),
      hasApiKey: Boolean(INTERAKT_CONFIG.apiKey),
      apiUrl: INTERAKT_CONFIG.apiUrl,
    };
  }
}

module.exports = new InteraktWhatsAppService();
