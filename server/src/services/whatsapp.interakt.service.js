const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Interakt WhatsApp API Service
 * Documentation: https://www.interakt.shop/resource-center/interakt-apis-and-webhooks-an-overview/
 * 
 * Interakt provides:
 * - User Track API: Add/update users
 * - Event Track API: Trigger campaigns based on events
 * - Template Message Send API: Send pre-approved templates
 * - Webhooks: Receive message statuses and incoming messages
 * 
 * Rate Limits:
 * - Growth Plan: 300 requests/minute
 * - Advanced Plan: 600 requests/minute
 * - Enterprise Plan: Configurable
 */

const INTERAKT_CONFIG = {
  apiUrl: process.env.INTERAKT_API_URL || 'https://api.interakt.ai/v1',
  apiKey: process.env.INTERAKT_API_KEY,
  phoneNumberId: process.env.INTERAKT_PHONE_NUMBER_ID,
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

class InteraktWhatsAppService {
  /**
   * Make API request to Interakt
   * Authorization: Uses API Key in Authorization header
   */
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
        method,
        error: error.response?.data || error.message,
        status: error.response?.status,
      });
      throw error;
    }
  }

  /**
   * Normalize phone number
   */
  _normalizePhone(phone) {
    // Interakt expects phone with country code (e.g., 919876543210)
    let normalized = String(phone || '').replace(/\D/g, '');
    
    // Add country code if not present (assuming India +91)
    if (normalized.length === 10) {
      normalized = '91' + normalized;
    }
    
    return normalized;
  }

  /**
   * Get ticket view URL
   */
  _ticketViewUrl(ticketNumber) {
    const baseUrl = process.env.FRONTEND_URL || INTERAKT_CONFIG.publicBaseUrl;
    return baseUrl ? `${baseUrl.replace(/\/$/, '')}/tickets/${ticketNumber}` : '';
  }

  _ticketPdfUrl(ticketNumber) {
    const apiBaseUrl = process.env.API_BASE_URL || process.env.BACKEND_URL || '';
    if (!apiBaseUrl) return '';
    const base = apiBaseUrl.replace(/\/$/, '');
    const apiPrefix = base.endsWith('/api/v1') ? '' : '/api/v1';
    return `${base}${apiPrefix}/tickets/${ticketNumber}/pdf`;
  }

  /**
   * Persist QR code image
   */
  _persistQrCode(ticketNumber, qrCodeDataUrl) {
    if (!qrCodeDataUrl || !qrCodeDataUrl.startsWith('data:image/')) return null;
    if (!INTERAKT_CONFIG.publicBaseUrl) return null;

    const match = qrCodeDataUrl.match(/^data:image\/png;base64,(.+)$/);
    if (!match) return null;

    fs.mkdirSync(QR_STORAGE_DIR, { recursive: true });
    const safeTicketNumber = String(ticketNumber).replace(/[^a-zA-Z0-9_-]/g, '');
    const fileName = `${safeTicketNumber}.png`;
    fs.writeFileSync(path.join(QR_STORAGE_DIR, fileName), Buffer.from(match[1], 'base64'));

    return `${INTERAKT_CONFIG.publicBaseUrl.replace(/\/$/, '')}/storage/qrcodes/${fileName}`;
  }

  /**
   * User Track API
   * Add or update a user in Interakt
   * Docs: https://developers.interakt.shop/docs/user-track-api
   */
  async trackUser(phoneNumber, userData = {}) {
    const payload = {
      phoneNumber: this._normalizePhone(phoneNumber),
      countryCode: '+91',
      traits: {
        name: userData.name || '',
        email: userData.email || '',
        ...userData.traits,
      },
      tags: userData.tags || [],
    };

    const response = await this._request('POST', '/track/users/', payload);
    logger.info('Interakt user tracked', { phoneNumber, userId: response.userId });
    return response;
  }

  /**
   * Event Track API
   * Trigger campaigns based on events
   * Docs: https://developers.interakt.shop/docs/event-track-api
   */
  async trackEvent(phoneNumber, eventName, eventData = {}) {
    const payload = {
      phoneNumber: this._normalizePhone(phoneNumber),
      countryCode: '+91',
      event: eventName,
      traits: eventData,
    };

    const response = await this._request('POST', '/track/events/', payload);
    logger.info('Interakt event tracked', { phoneNumber, eventName });
    return response;
  }

  /**
   * Template Message Send API
   * Send pre-approved WhatsApp template messages
   * Docs: https://developers.interakt.shop/docs/send-template-api
   */
  async sendTemplateMessage(phoneNumber, templateName, templateData = {}) {
    const payload = {
      countryCode: '+91',
      phoneNumber: this._normalizePhone(phoneNumber),
      callbackData: templateData.callbackData || 'Buizz Notification',
      type: 'Template',
      template: {
        name: templateName,
        languageCode: 'en',
        headerValues: templateData.headerValues || [],
        bodyValues: templateData.bodyValues || [],
        buttonValues: templateData.buttonValues || {},
      },
    };

    const response = await this._request('POST', '/track/events/', payload);
    logger.info('Interakt template message sent', {
      phoneNumber,
      templateName,
      messageId: response.messageId,
    });

    return {
      success: true,
      messageId: response.messageId,
      result: response.result,
    };
  }

  /**
   * Send Booking Confirmation
   * Uses Event Track API to trigger booking confirmation campaign
   */
  async sendBookingConfirmation(phoneNumber, bookingDetails) {
    const details = {
      ...bookingDetails,
      eventDate: bookingDetails.eventDate || formatDateTime(bookingDetails.event_date),
      amountPaid: bookingDetails.amountPaid || formatMoney(bookingDetails.amount),
    };

    // First, track/update the user
    try {
      await this.trackUser(phoneNumber, {
        name: details.userName,
        email: details.userEmail,
        traits: {
          lastBookingDate: new Date().toISOString(),
          totalBookings: 1, // You can increment this from database
        },
      });
    } catch (error) {
      logger.warn('User tracking failed, continuing with booking confirmation', {
        phoneNumber,
        error: error.message,
      });
    }

    // Track booking event to trigger campaign
    const eventData = {
      event_name: details.eventName,
      event_date: details.eventDate,
      event_venue: details.eventVenue,
      ticket_number: details.ticketNumber,
      ticket_type: details.ticketType,
      quantity: String(details.quantity || 1),
      amount_paid: details.amountPaid,
      order_id: details.orderId,
      transaction_id: details.transactionId || 'N/A',
      booking_url: this._ticketViewUrl(details.ticketNumber),
      ticket_pdf_url: details.ticketPdfUrl || this._ticketPdfUrl(details.ticketNumber),
    };

    try {
      // Option 1: Track event (requires campaign setup in Interakt dashboard)
      const response = await this.trackEvent(
        phoneNumber,
        'booking_confirmed',
        eventData
      );

      logger.info('Interakt booking confirmation sent via event', {
        phoneNumber,
        orderId: details.orderId,
        eventId: response.eventId,
      });

      return {
        success: true,
        method: 'event_track',
        eventId: response.eventId,
        results: [{ type: 'event', ...response }],
      };
    } catch (error) {
      logger.error('Interakt booking confirmation failed', {
        phoneNumber,
        orderId: details.orderId,
        error: error.response?.data || error.message,
      });

      // Fallback: Try sending via template (if template exists)
      try {
        const templateResponse = await this.sendTemplateMessage(
          phoneNumber,
          'booking_confirmation',
          {
            bodyValues: [
              details.userName,
              details.eventName,
              details.eventDate,
              details.eventVenue,
              details.ticketNumber,
              details.amountPaid,
              details.orderId,
            ],
          }
        );

        return {
          success: true,
          method: 'template',
          ...templateResponse,
        };
      } catch (templateError) {
        logger.error('Interakt template fallback also failed', {
          phoneNumber,
          error: templateError.message,
        });
        throw error;
      }
    }
  }

  /**
   * Send Ticket QR Code
   * Note: Interakt doesn't have direct image sending via API
   * Alternative: Include QR URL in template or use media message
   */
  async sendTicketQr(phoneNumber, ticket) {
    const ticketNumber = ticket.ticketNumber || ticket.ticket_number;
    const qrUrl = ticket.qrUrl || this._persistQrCode(ticketNumber, ticket.qrCode || ticket.qr_code);

    if (!qrUrl) {
      logger.warn('Ticket QR skipped - no public URL available', { ticketNumber });
      return { skipped: true, reason: 'qr_url_unavailable' };
    }

    // Track event with QR URL (campaign should include media)
    try {
      const response = await this.trackEvent(phoneNumber, 'ticket_qr_sent', {
        ticket_number: ticketNumber,
        qr_url: qrUrl,
        message: `Ticket QR: ${ticketNumber}. Show this at the venue entrance.`,
      });

      return {
        success: true,
        messageId: response.eventId,
      };
    } catch (error) {
      logger.error('Interakt ticket QR send failed', {
        ticketNumber,
        error: error.message,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send Ticket Details
   */
  async sendTicketDetails(phoneNumber, ticket) {
    const eventDate = formatDateTime(ticket.event_date || ticket.eventDate);
    const venue = [ticket.venue_name, ticket.venue_address].filter(Boolean).join(', ') || ticket.eventVenue || 'TBD';

    const eventData = {
      user_name: ticket.user_name || ticket.userName,
      event_name: ticket.event_title || ticket.eventName,
      event_date: eventDate,
      event_venue: venue,
      ticket_type: ticket.ticket_type || ticket.ticketType,
      ticket_number: ticket.ticket_number || ticket.ticketNumber,
      amount_paid: formatMoney(ticket.price),
      order_id: ticket.order_id || ticket.orderId,
      transaction_id: ticket.transaction_id || ticket.transactionId,
    };

    const response = await this.trackEvent(phoneNumber, 'ticket_details_sent', eventData);
    await this.sendTicketQr(phoneNumber, ticket);

    return {
      success: true,
      results: [
        { type: 'event', ...response },
        { type: 'ticket_qr', status: 'sent' },
      ],
    };
  }

  /**
   * Send Event Reminder
   */
  async sendEventReminder(phoneNumber, reminderDetails) {
    const details = {
      ...reminderDetails,
      eventDate: reminderDetails.eventDate || formatDateTime(reminderDetails.event_date),
    };

    const eventData = {
      event_name: details.eventName,
      event_date: details.eventDate,
      event_venue: details.eventVenue,
      ticket_number: details.ticketNumber,
    };

    try {
      const response = await this.trackEvent(phoneNumber, 'event_reminder', eventData);

      logger.info('Interakt event reminder sent', {
        phoneNumber,
        eventName: details.eventName,
      });

      return { success: true, eventId: response.eventId };
    } catch (error) {
      logger.error('Interakt event reminder failed', {
        phoneNumber,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get Users API
   * Fetch users from Interakt account
   * Docs: https://developers.interakt.shop/docs/get-users-api
   */
  async getUsers(filters = {}) {
    const params = {
      page: filters.page || 1,
      limit: filters.limit || 50,
    };

    if (filters.createdAfter) {
      params.createdAfter = filters.createdAfter;
    }

    if (filters.modifiedAfter) {
      params.modifiedAfter = filters.modifiedAfter;
    }

    const response = await this._request('GET', '/track/users/', null);
    return response;
  }

  /**
   * Check if Interakt is configured
   */
  isConfigured() {
    return !!(
      INTERAKT_CONFIG.apiKey &&
      !String(INTERAKT_CONFIG.apiKey).startsWith('your-')
    );
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      provider: 'Interakt',
      configured: this.isConfigured(),
      hasApiKey: Boolean(INTERAKT_CONFIG.apiKey && !String(INTERAKT_CONFIG.apiKey).startsWith('your-')),
      hasPhoneNumberId: Boolean(INTERAKT_CONFIG.phoneNumberId && !String(INTERAKT_CONFIG.phoneNumberId).startsWith('your-')),
      hasPublicBaseUrl: Boolean(INTERAKT_CONFIG.publicBaseUrl),
      publicBaseUrl: INTERAKT_CONFIG.publicBaseUrl || null,
      apiUrl: INTERAKT_CONFIG.apiUrl,
      rateLimits: {
        growth: '300 requests/minute',
        advanced: '600 requests/minute',
        enterprise: 'Configurable',
      },
    };
  }
}

module.exports = new InteraktWhatsAppService();
