const { getMySQLPool } = require('../../database/mysql');
const { AppError } = require('../../middleware/errorHandler');
const ticketRepository = require('../../repositories/ticket.repository');
const eventRepository = require('../events/event.repository');
const whatsappService = require('../../services/whatsapp.service');
const logger = require('../../utils/logger');

const TICKET_LIMIT_PER_EVENT = 10;

class OfflineBookingService {
  async checkTicketLimit(userId, eventId) {
    const pool = getMySQLPool();
    
    const [result] = await pool.query(
      'SELECT total_tickets FROM user_event_bookings WHERE user_id = ? AND event_id = ?',
      [userId, eventId]
    );

    const currentTickets = result[0]?.total_tickets || 0;
    return { currentTickets, remaining: TICKET_LIMIT_PER_EVENT - currentTickets };
  }

  async createOfflineBooking(bookingData, organizerId) {
    const { eventId, ticketTypeId, quantity, customerName, customerEmail, customerPhone, userId } = bookingData;
    
    const pool = getMySQLPool();
    
    // Validate event
    const event = await eventRepository.findById(eventId);
    if (!event) throw new AppError('Event not found', 404);
    if (String(event.organizerId) !== String(organizerId)) {
      throw new AppError('Not authorized to create bookings for this event', 403);
    }

    // Check ticket limit
    if (userId) {
      const limitCheck = await this.checkTicketLimit(userId, eventId);
      if (limitCheck.currentTickets + quantity > TICKET_LIMIT_PER_EVENT) {
        throw new AppError(`User can only book ${TICKET_LIMIT_PER_EVENT} tickets per event. Already booked: ${limitCheck.currentTickets}`, 400);
      }
    }

    // Get ticket type
    const [ttRows] = await pool.query(
      'SELECT * FROM ticket_types WHERE id = ? AND event_id = ? AND is_active = 1',
      [ticketTypeId, eventId]
    );

    const ticketType = ttRows[0];
    if (!ticketType) throw new AppError('Invalid ticket type', 400);
    if (ticketType.available_quantity < quantity) {
      throw new AppError('Not enough tickets available', 400);
    }

    const amount = parseFloat(ticketType.price) * quantity;
    const bookingNumber = `${Date.now()}${userId || 'OFFLINE'}`;
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year

    // Create booking
    const [bookingResult] = await pool.execute(
      `INSERT INTO bookings (booking_number, user_id, event_id, ticket_type_id, quantity, total_amount, booking_status, payment_status, booking_method, created_by, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, 'confirmed', 'completed', 'offline', ?, ?)`,
      [bookingNumber, userId, eventId, ticketTypeId, quantity, amount, organizerId, expiresAt]
    );

    const bookingId = bookingResult.insertId;

    // Create payment record with COD
    const orderId = `OFF${Date.now()}${organizerId}`;
    const [paymentResult] = await pool.execute(
      `INSERT INTO payments (booking_id, user_id, event_id, order_id, amount, currency, status, payment_method, gateway_response, transaction_id)
       VALUES (?, ?, ?, ?, ?, 'INR', 'completed', 'cod', ?, ?)`,
      [bookingId, userId, eventId, orderId, amount, JSON.stringify({ method: 'cod', customerName, customerEmail, customerPhone }), orderId]
    );

    const paymentId = paymentResult.insertId;

    // Update ticket type quantity
    await pool.query(
      'UPDATE ticket_types SET available_quantity = available_quantity - ? WHERE id = ?',
      [quantity, ticketTypeId]
    );

    // Update event seats
    if (event.available_seats !== null) {
      await pool.execute(
        'UPDATE events SET available_seats = available_seats - ? WHERE event_id = ?',
        [quantity, eventId]
      );
    }

    // Update user booking count
    if (userId) {
      await pool.execute(
        `INSERT INTO user_event_bookings (user_id, event_id, total_tickets)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE total_tickets = total_tickets + ?`,
        [userId, eventId, quantity, quantity]
      );
    }

    // Create tickets with QR codes
    const tickets = [];
    for (let i = 0; i < quantity; i++) {
      const ticketNumber = await ticketRepository.generateTicketNumber();
      const ticket = await ticketRepository.create({
        ticket_number: ticketNumber,
        booking_id: bookingId,
        payment_id: paymentId,
        event_id: eventId,
        user_id: userId,
        ticket_type_id: ticketTypeId,
        ticket_type: ticketType.name,
        price: amount / quantity,
        status: 'active'
      });

      tickets.push({
        ticket_id: ticket.ticket_id,
        ticket_number: ticketNumber,
        ticket_type: ticketType.name,
        price: amount / quantity,
        status: 'active',
        qr_code: ticket.qr_code
      });
    }

    logger.info('Offline booking created', { bookingId, orderId, organizerId, quantity });

    // Send notification
    await this.sendOfflineBookingNotification(userId, organizerId, event, tickets, customerEmail, customerName);

    if (customerPhone && whatsappService.isConfigured()) {
      await whatsappService.sendBookingConfirmation(customerPhone, {
        userName: customerName || customerEmail || 'Guest',
        ticketNumber: tickets[0]?.ticket_number,
        eventName: event.title,
        eventDate: new Date(event.start_date).toLocaleString('en-IN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
        eventVenue: event.type === 'online'
          ? 'Online Event'
          : [event.venue_name, event.venue_city, event.venue_state].filter(Boolean).join(', ') || 'Venue TBD',
        ticketType: ticketType.name,
        quantity,
        amountPaid: `Rs. ${Number(amount).toLocaleString('en-IN')}`,
        orderId,
        transactionId: orderId,
        tickets: tickets.map((ticket) => ({
          ticketNumber: ticket.ticket_number,
          ticketType: ticket.ticket_type,
          qrCode: ticket.qr_code,
        })),
      }).catch((error) => {
        logger.error('Failed to send offline booking WhatsApp confirmation', {
          orderId,
          error: error.response?.data || error.message,
        });
      });
    }

    return {
      booking: {
        bookingId,
        bookingNumber,
        orderId,
        amount,
        quantity,
        paymentMethod: 'cod'
      },
      tickets,
      event: {
        id: event.event_id,
        title: event.title,
        startDate: event.start_date,
        venue: event.venue_name
      }
    };
  }

  async sendOfflineBookingNotification(userId, organizerId, event, tickets, customerEmail, customerName) {
    const pool = getMySQLPool();
    
    // Notify customer if userId exists
    if (userId) {
      await pool.execute(
        `INSERT INTO notifications (user_id, type, channel, title, message, data, status)
         VALUES (?, 'email', 'booking_offline', 'Offline Booking Confirmed', ?, ?, 'pending')`,
        [
          userId,
          `Your offline booking for ${event.title} has been confirmed.`,
          JSON.stringify({ eventId: event.event_id, tickets: tickets.length })
        ]
      );
    }

    // Notify organizer
    await pool.execute(
      `INSERT INTO notifications (user_id, type, channel, title, message, data, status)
       VALUES (?, 'email', 'booking_offline', 'Offline Booking Created', ?, ?, 'pending')`,
      [
        organizerId,
        `You created an offline booking for ${customerName || customerEmail} for event ${event.title}.`,
        JSON.stringify({ eventId: event.event_id, tickets: tickets.length, customer: customerEmail })
      ]
    );
  }

  async getOfflineBookings(organizerId, eventId = null, page = 1, limit = 20) {
    const pool = getMySQLPool();
    const offset = (page - 1) * limit;

    let query = `
      SELECT b.*, e.title as event_title, u.name as customer_name, u.email as customer_email
      FROM bookings b
      JOIN events e ON b.event_id = e.event_id
      LEFT JOIN users u ON b.user_id = u.user_id
      WHERE b.booking_method = 'offline' AND b.created_by = ?
    `;
    
    const params = [organizerId];

    if (eventId) {
      query += ' AND b.event_id = ?';
      params.push(eventId);
    }

    query += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [bookings] = await pool.query(query, params);
    return { bookings, page, limit };
  }
}

module.exports = new OfflineBookingService();
