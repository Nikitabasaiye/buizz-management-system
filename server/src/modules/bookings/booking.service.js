const phonePeService = require('../../services/phonepe.service');
const razorpayService = require('../../services/razorpay.service');
const paymentRepository = require('../../repositories/payment.repository');
const ticketRepository = require('../../repositories/ticket.repository');
const eventRepository = require('../events/event.repository');
const userRepository = require('../users/user.repository');
const settlementService = require('../settlements/settlement.service');
const privacyService = require('../../services/privacy.service');
const auditService = require('../../services/audit.service');
const pdfService = require('../../services/pdf.service');
const { sendTicketWithFallback } = require('../../services/delivery.service');
const { AppError } = require('../../middleware/errorHandler');
const { getMySQLPool } = require('../../database/mysql');
const logger = require('../../utils/logger');

const TICKET_LIMIT_PER_EVENT = 10;

class BookingService {
  async checkTicketLimit(userId, eventId) {
    const pool = getMySQLPool();
    
    const [result] = await pool.query(
      'SELECT total_tickets FROM user_event_bookings WHERE user_id = ? AND event_id = ?',
      [userId, eventId]
    );

    const currentTickets = result[0]?.total_tickets || 0;
    return { currentTickets, remaining: TICKET_LIMIT_PER_EVENT - currentTickets };
  }

  async initiateBooking(bookingData, user) {
    // Check at least one payment gateway is configured
    if (!phonePeService.isConfigured() && !razorpayService.isConfigured()) {
      throw new AppError('Payment gateway not configured. Please contact administrator.', 500);
    }

    const { eventId, ticketTypeId, quantity = 1 } = bookingData;
    
    // Validate and parse inputs
    const parsedEventId = parseInt(eventId, 10);
    const parsedTicketTypeId = parseInt(ticketTypeId, 10);
    const parsedQuantity = parseInt(quantity, 10);

    logger.info('Booking request parsed', { 
      parsedEventId, 
      parsedTicketTypeId, 
      parsedQuantity,
      userId: user.id 
    });

    if (isNaN(parsedEventId)) throw new AppError('Invalid event ID', 400);
    if (isNaN(parsedTicketTypeId)) throw new AppError('Invalid ticket type ID', 400);
    if (isNaN(parsedQuantity) || parsedQuantity < 1) throw new AppError('Invalid quantity', 400);

    // Check ticket limit
    const limitCheck = await this.checkTicketLimit(user.id, parsedEventId);
    if (limitCheck.currentTickets + parsedQuantity > TICKET_LIMIT_PER_EVENT) {
      throw new AppError(`You can only book ${TICKET_LIMIT_PER_EVENT} tickets per event. Already booked: ${limitCheck.currentTickets}`, 400);
    }

    const event = await eventRepository.findById(parsedEventId);
    if (!event) throw new AppError('Event not found', 404);
    if (event.status !== 'published') throw new AppError('Event is not available for booking', 400);

    logger.info('Event found', { eventId: event.id, title: event.title, status: event.status });

    const pool = getMySQLPool();
    
    const [ttRows] = await pool.query(
      'SELECT * FROM ticket_types WHERE id = ? AND event_id = ? AND is_active = 1',
      [parsedTicketTypeId, parsedEventId]
    );

    const ticketType = ttRows[0];
    
    if (!ticketType) {
      throw new AppError('Invalid ticket type', 400);
    }

    if (ticketType.available_quantity < parsedQuantity) {
      throw new AppError('Not enough tickets available', 400);
    }

    // Accept fee breakdown from client; fall back to ticket price only
    const ticketSubtotal = parseFloat(ticketType.price) * parsedQuantity;
    const platformFee = parseFloat(bookingData.platformFee || 0);
    const convenienceFee = parseFloat(bookingData.convenienceFee || 0);
    const taxes = parseFloat(bookingData.taxes || 0);
    const amount = parseFloat((ticketSubtotal + platformFee + convenienceFee + taxes).toFixed(2));
    const { generateBigIntOrderId } = require('../../utils/orderId');
    const orderId = generateBigIntOrderId();

    // Generate booking number
    const bookingNumber = `${Date.now()}${user.id}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    logger.info('Creating booking record', { bookingNumber, amount, userId: user.id });

    // Step 1: Create booking first
    const [bookingResult] = await pool.execute(
      `INSERT INTO bookings (booking_number, user_id, event_id, ticket_type_id, quantity, total_amount, booking_status, payment_status, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [bookingNumber, user.id, parsedEventId, parsedTicketTypeId, parsedQuantity, amount, 'pending', 'pending', expiresAt]
    );

    const bookingId = bookingResult.insertId;

    logger.info('Booking created', { bookingId, bookingNumber });

    // Step 2: Create payment record
    await paymentRepository.create({
      booking_id: bookingId,
      user_id: user.id,
      event_id: parsedEventId,
      order_id: orderId,
      amount,
      currency: 'INR',
      status: 'pending',
      payment_method: 'phonepe',
      metadata: { 
        ticketTypeId: parsedTicketTypeId, 
        ticketTypeName: ticketType.name, 
        quantity: parsedQuantity,
        bookingNumber: bookingNumber,
        ticketSubtotal,
        platformFee,
        convenienceFee,
        taxes,
      },
    });

    logger.info('Payment record created', { orderId, bookingId });

    // Step 3: Try PhonePe first, fallback to Razorpay
    let phonePeError = null;

    if (phonePeService.isConfigured()) {
      try {
        const paymentResponse = await phonePeService.initiatePayment({
          orderId,
          amount,
          userId: user.id,
          userName: user.name,
          userPhone: user.phone,
          userEmail: user.email,
        });

        // Update payment record with phonepe method
        await paymentRepository.updateStatus(orderId, {
          status: 'pending',
          transaction_id: null,
          payment_method: 'phonepe',
          metadata: { ticketTypeId: parsedTicketTypeId, ticketTypeName: ticketType.name, quantity: parsedQuantity, bookingNumber, ticketSubtotal, platformFee, convenienceFee, taxes },
        });

        logger.info('PhonePe payment initiated successfully', { orderId, bookingId, userId: user.id });

        return {
          success: true,
          orderId,
          bookingNumber,
          gateway: 'phonepe',
          paymentUrl: paymentResponse.paymentUrl,
          amount,
          currency: 'INR',
          ticketType: ticketType.name,
          quantity: parsedQuantity,
          expiresAt: expiresAt.toISOString(),
        };
      } catch (error) {
        phonePeError = error;
        logger.warn('PhonePe initiation failed, falling back to Razorpay', { orderId, error: error.message });
      }
    }

    // Razorpay fallback (or primary if PhonePe not configured)
    if (razorpayService.isConfigured()) {
      try {
        const rzpOrder = await razorpayService.createOrder({
          orderId,
          amount,
          notes: {
            bookingId: String(bookingId),
            bookingNumber,
            userId: String(user.id),
            eventId: String(parsedEventId),
            ticketTypeId: String(parsedTicketTypeId),
          },
        });

        await paymentRepository.updateStatus(orderId, {
          status: 'pending',
          transaction_id: null,
          payment_method: 'razorpay',
          metadata: {
            ticketTypeId: parsedTicketTypeId,
            ticketTypeName: ticketType.name,
            quantity: parsedQuantity,
            bookingNumber,
            razorpayOrderId: rzpOrder.razorpayOrderId,
            ticketSubtotal,
            platformFee,
            convenienceFee,
            taxes,
          },
        });

        logger.info('Razorpay order created as fallback', { orderId, bookingId, razorpayOrderId: rzpOrder.razorpayOrderId });

        return {
          success: true,
          orderId,
          bookingNumber,
          gateway: 'razorpay',
          razorpayOrderId: rzpOrder.razorpayOrderId,
          razorpayKeyId: rzpOrder.keyId,
          amount,
          currency: 'INR',
          ticketType: ticketType.name,
          quantity: parsedQuantity,
          expiresAt: expiresAt.toISOString(),
          userName: user.name,
          userEmail: user.email,
          userPhone: user.phone,
        };
      } catch (rzpError) {
        logger.error('Razorpay fallback also failed', { orderId, bookingId, error: rzpError.message });

        await pool.execute(
          'UPDATE bookings SET booking_status = ?, payment_status = ? WHERE booking_id = ?',
          ['cancelled', 'failed', bookingId]
        );
        await paymentRepository.updateStatus(orderId, {
          status: 'failed',
          transaction_id: null,
          payment_method: 'razorpay',
          metadata: { phonePeError: phonePeError?.message, razorpayError: rzpError.message },
        });

        throw new AppError('All payment gateways failed. Please try again later.', 500);
      }
    }

    // Neither gateway worked
    await pool.execute(
      'UPDATE bookings SET booking_status = ?, payment_status = ? WHERE booking_id = ?',
      ['cancelled', 'failed', bookingId]
    );
    await paymentRepository.updateStatus(orderId, {
      status: 'failed',
      transaction_id: null,
      payment_method: 'phonepe',
      metadata: { error: phonePeError?.message || 'No gateway available' },
    });

    throw new AppError('Payment gateway not available. Please try again later.', 500);
  }

  async handlePaymentCallback(callbackData, authorization = '') {
    const parsedCallback = callbackData?.type || callbackData?.payload || callbackData?.response
      ? phonePeService.parseWebhook(callbackData, authorization)
      : callbackData;

    const {
      merchantTransactionId,
      transactionId,
      responseCode
    } = parsedCallback;

    const payment = await paymentRepository.findByOrderId(merchantTransactionId);
    if (!payment) throw new AppError('Payment record not found', 404);

    if (payment.status === 'completed') {
      logger.info('Payment already processed, skipping', { orderId: merchantTransactionId });
      return { success: true, status: 'already_completed' };
    }

    const verification = await phonePeService.verifyPayment(merchantTransactionId);

    if (verification.success && verification.status === 'COMPLETED') {
      const pool = getMySQLPool();

      // Update payment
      await paymentRepository.updateStatus(merchantTransactionId, {
        status: 'completed',
        transaction_id: verification.transactionId,
        payment_method: verification.paymentMethod,
        metadata: { responseCode: verification.responseCode },
      });

      // Update booking
      await pool.execute(
        'UPDATE bookings SET booking_status = ?, payment_status = ? WHERE booking_id = ?',
        ['confirmed', 'completed', payment.booking_id]
      );

      await settlementService.recordCompletedPayment(merchantTransactionId).catch((error) => {
        logger.error('Failed to record settlement item', {
          orderId: merchantTransactionId,
          error: error.message
        });
      });

      const updatedPayment = await paymentRepository.findByOrderId(merchantTransactionId);
      const bookingConfirmation = await this.createTicketsAndEnqueueJobs(updatedPayment);

      logger.info('Payment verified and booking confirmed', {
        orderId: merchantTransactionId,
        transactionId: verification.transactionId,
      });

      return { success: true, status: 'completed', bookingConfirmation };
    }

    // Payment failed
    const pool = getMySQLPool();
    await pool.execute(
      'UPDATE bookings SET booking_status = ?, payment_status = ? WHERE booking_id = ?',
      ['cancelled', 'failed', payment.booking_id]
    );

    await paymentRepository.updateStatus(merchantTransactionId, {
      status: 'failed',
      transaction_id: transactionId,
      payment_method: 'phonepe',
      metadata: { responseCode },
    });

    await settlementService.reversePaymentSettlement(merchantTransactionId).catch((error) => {
      logger.error('Failed to reverse settlement item', {
        orderId: merchantTransactionId,
        error: error.message
      });
    });

    logger.warn('Payment verification failed', { orderId: merchantTransactionId });
    return { success: false, status: 'failed', message: 'Payment failed or not verified' };
  }

  async createTicketsAndEnqueueJobs(payment) {
    const metadata = typeof payment.gateway_response === 'string'
      ? JSON.parse(payment.gateway_response)
      : payment.gateway_response;
    
    const pool = getMySQLPool();

    // Try to get ticket info from metadata first, fallback to booking
    let ticketTypeId = metadata?.ticketTypeId;
    let ticketTypeName = metadata?.ticketTypeName;
    let quantity = metadata?.quantity || 1;

    // If metadata doesn't have ticket info, fetch from booking
    if (!ticketTypeId && payment.booking_id) {
      const [bookingRows] = await pool.execute(
        'SELECT ticket_type_id, quantity FROM bookings WHERE booking_id = ?',
        [payment.booking_id]
      );
      if (bookingRows[0]) {
        ticketTypeId = bookingRows[0].ticket_type_id;
        quantity = bookingRows[0].quantity;
      }
    }

    // If still no ticket type ID, try to get from event's default ticket type
    if (!ticketTypeId) {
      const [ticketTypeRows] = await pool.execute(
        'SELECT id, name FROM ticket_types WHERE event_id = ? LIMIT 1',
        [payment.event_id]
      );
      if (ticketTypeRows[0]) {
        ticketTypeId = ticketTypeRows[0].id;
        ticketTypeName = ticketTypeRows[0].name;
      }
    }

    if (!ticketTypeId) {
      throw new AppError('Ticket type not found. Cannot create tickets.', 400);
    }

    const [event, user, ticketType] = await Promise.all([
      eventRepository.findById(payment.event_id),
      userRepository.findById(payment.user_id),
      pool.execute('SELECT name FROM ticket_types WHERE id = ?', [ticketTypeId]).then(r => r[0][0]),
    ]);

    if (!event) throw new AppError('Event not found', 404);
    if (!user) throw new AppError('User not found', 404);
    if (!ticketType) throw new AppError('Ticket type not found', 404);

    ticketTypeName = ticketTypeName || ticketType.name;
    const ticketTypePrice = Number(payment.amount) / Math.max(1, Number(quantity || 1));

    const [existingTickets] = await pool.execute(
      'SELECT ticket_id, ticket_number, ticket_type, price, status, qr_code, qr_data FROM tickets WHERE payment_id = ? ORDER BY ticket_id ASC',
      [payment.payment_id]
    );

    const tickets = existingTickets.map((ticket) => ({
      ticket_id: ticket.ticket_id,
      ticket_number: ticket.ticket_number,
      ticket_type: ticket.ticket_type || ticketTypeName,
      price: Number(ticket.price || ticketTypePrice),
      status: ticket.status || 'active',
      qr_code: ticket.qr_code,
      qr_data: ticket.qr_data,
    }));

    if (!tickets.length) {
      // Update ticket type quantity exactly once for this paid booking.
      await pool.query(
        'UPDATE ticket_types SET available_quantity = available_quantity - ? WHERE id = ?',
        [quantity, ticketTypeId]
      );

      // Update user booking count exactly once for this paid booking.
      await pool.execute(
        `INSERT INTO user_event_bookings (user_id, event_id, total_tickets)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE total_tickets = total_tickets + ?`,
        [payment.user_id, payment.event_id, quantity, quantity]
      );

      for (let i = 0; i < quantity; i++) {
        const ticketNumber = await ticketRepository.generateTicketNumber();
        const ticket = await ticketRepository.create({
          ticket_number: ticketNumber,
          booking_id: payment.booking_id,
          payment_id: payment.payment_id,
          event_id: payment.event_id,
          user_id: payment.user_id,
          ticket_type_id: ticketTypeId,
          ticket_type: ticketTypeName,
          price: ticketTypePrice,
          status: 'active'
        });

        tickets.push({
          ticket_id: ticket.ticket_id,
          ticket_number: ticketNumber,
          ticket_type: ticketTypeName,
          price: ticketTypePrice,
          status: 'active',
          qr_code: ticket.qr_code,
          qr_data: ticket.qr_data,
        });
      }

      // Update event seats exactly once for this paid booking.
      if (event.available_seats !== null) {
        await pool.execute(
          'UPDATE events SET available_seats = available_seats - ? WHERE event_id = ?',
          [quantity, payment.event_id]
        );
      }
    }

    // Log successful booking confirmation
    logger.info('Booking confirmed - Tickets created', { orderId: payment.order_id, ticketCount: tickets.length });

    const emailDelivery = {
      attempted: false,
      sent: false,
      skipped: false,
      reason: null,
      error: null,
      to: user.email || null,
      whatsappTo: user.phone || null,
      fallbackDelivery: null,
    };

    // Send ticket through WhatsApp first, then email fallback
    if (user.email || user.phone) {
      emailDelivery.attempted = true;
      const eventDateFormatted = new Date(event.start_date).toLocaleString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long',
        day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
      });
      const eventTimeFormatted = new Date(event.start_date).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const eventVenue = event.type === 'online'
        ? 'Online Event'
        : [event.venue_name, event.venue_city, event.venue_state].filter(Boolean).join(', ') || 'Venue TBD';
      const seatGroups = [{
        section: ticketTypeName || 'General',
        totalSeats: quantity,
        seatNumbers: `${ticketTypeName || 'General'} x${quantity}`,
        amount: Number(payment.amount),
      }];

      // Generate a single PDF for the entire booking with quantity * amount
      const pdfAttachments = [];
      try {
        const pdfBuffer = await pdfService.generateTicketPdf({
          ticketNumber: tickets[0].ticket_number, // Use first ticket number as booking ID
          eventName: event.title,
          eventDate: eventDateFormatted,
          eventTime: eventTimeFormatted,
          eventVenue,
          eventAddress: [event.venue_address, event.venue_city, event.venue_state].filter(Boolean).join(', '),
          userName: user.name,
          userEmail: user.email,
          ticketType: ticketTypeName,
          price: Number(payment.amount), // Total amount paid
          quantity: quantity, // Total quantity
          perTicketPrice: ticketTypePrice, // Price per ticket
          orderId: payment.order_id,
          transactionId: payment.transaction_id || 'Pending',
          qrCodeDataUrl: tickets[0].qr_code, // Use first ticket's QR code
          organizerName: event.organizer_name || 'Buizz',
          eventBanner: event.banner,
          category: event.category || 'Music Events',
          totalSeats: quantity,
          seatInfo: `${ticketTypeName} x${quantity}`,
          seatGroups,
        });
        
        pdfAttachments.push({
          filename: `Buizz-Ticket-${tickets[0].ticket_number}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        });
        
        logger.info('Single booking PDF generated successfully', { 
          orderId: payment.order_id, 
          quantity,
          totalAmount: payment.amount 
        });
      } catch (pdfErr) {
        emailDelivery.skipped = true;
        emailDelivery.reason = 'PDF_GENERATION_FAILED';
        emailDelivery.error = pdfErr.message;
        logger.error('PDF generation failed for booking', { 
          orderId: payment.order_id, 
          error: pdfErr.message, 
          stack: pdfErr.stack 
        });
      }

      if (pdfAttachments.length > 0) {
        try {
          const fallbackDelivery = await sendTicketWithFallback({
            phone: user.phone,
            whatsappPayload: {
              userName: user.name,
              ticketNumber: tickets[0]?.ticket_number,
              eventName: event.title,
              eventDate: eventDateFormatted,
              eventVenue,
              ticketType: ticketTypeName,
              quantity,
              amountPaid: `Rs. ${Number(payment.amount).toLocaleString('en-IN')}`,
              orderId: payment.order_id,
              transactionId: payment.transaction_id || 'N/A',
              ticketUrl: `${(process.env.FRONTEND_URL || 'https://www.buizz.com').replace(/\/$/, '')}/profile/tickets`,
              tickets: tickets.map((ticket) => ({
                ticketNumber: ticket.ticket_number,
                ticketType: ticket.ticket_type,
                qrCode: ticket.qr_code,
              })),
            },
            emailPayload: {
            to: user.email,
            userName: user.name,
            eventName: event.title,
            eventDate: eventDateFormatted,
            eventTime: eventTimeFormatted,
            eventVenue,
            ticketNumber: tickets[0]?.ticket_number,
            ticketType: ticketTypeName,
            quantity,
            amountPaid: `Rs. ${Number(payment.amount).toLocaleString('en-IN')}`,
            orderId: payment.order_id,
            qrCodeDataUrl: tickets[0]?.qr_code,
            eventImage: event.banner,
            category: event.category || 'Music Events',
            organizerName: event.organizer_name || 'Buizz',
            seatGroups,
            attachments: pdfAttachments,
            },
          });
          emailDelivery.fallbackDelivery = fallbackDelivery;
          
          if (fallbackDelivery.email.sent) {
            emailDelivery.sent = true;
            emailDelivery.messageId = fallbackDelivery.email.messageId || null;
            logger.info('Ticket PDF email sent successfully', { orderId: payment.order_id, email: user.email });
          } else if (fallbackDelivery.whatsapp.sent) {
            logger.info('Ticket sent successfully on WhatsApp', { orderId: payment.order_id, phone: user.phone });
          } else if (fallbackDelivery.email.skipped) {
            emailDelivery.skipped = true;
            emailDelivery.reason = fallbackDelivery.email.reason || fallbackDelivery.whatsapp.reason || 'DELIVERY_SKIPPED';
            emailDelivery.error = fallbackDelivery.email.error || fallbackDelivery.whatsapp.error || null;
            logger.warn('Ticket PDF email skipped', { orderId: payment.order_id, email: user.email, reason: emailDelivery.reason, error: emailDelivery.error });
          }
        } catch (emailError) {
          emailDelivery.skipped = true;
          emailDelivery.reason = 'EMAIL_SEND_EXCEPTION';
          emailDelivery.error = emailError.message;
          logger.error('Failed to send ticket PDF email', { 
            orderId: payment.order_id, 
            email: user.email, 
            error: emailError.message, 
            stack: emailError.stack 
          });
          // Don't throw - booking should succeed even if email fails
        }
      } else {
        if (!emailDelivery.reason) {
          emailDelivery.skipped = true;
          emailDelivery.reason = 'PDF_ATTACHMENT_MISSING';
        }
        logger.warn('No PDF attachments generated, skipping email', { orderId: payment.order_id });
      }
    } else {
      emailDelivery.skipped = true;
      emailDelivery.reason = 'USER_EMAIL_MISSING';
      logger.warn('User email not available, skipping ticket email', { userId: user.id, orderId: payment.order_id });
    }

    return {
      tickets,
      event: { 
        id: event.event_id, 
        title: event.title, 
        startDate: event.start_date, 
        venue: event.venue_name, 
        banner: event.banner 
      },
      payment: { 
        orderId: payment.order_id, 
        amount: payment.amount, 
        transactionId: payment.transaction_id 
      },
      emailDelivery,
    };
  }

  async getBookingDetails(orderId, userId) {
    const payment = await paymentRepository.findByOrderId(orderId);
    if (!payment) throw new AppError('Booking not found', 404);
    if (String(payment.user_id) !== String(userId)) throw new AppError('Access denied', 403);

    const pool = getMySQLPool();
    const [tickets] = await pool.query('SELECT * FROM tickets WHERE payment_id = ?', [payment.payment_id]);
    const event = await eventRepository.findById(payment.event_id);

    return {
      orderId: payment.order_id,
      status: payment.status,
      amount: payment.amount,
      transactionId: payment.transaction_id,
      event: { 
        id: event.event_id, 
        title: event.title, 
        startDate: event.start_date, 
        venue: event.venue_name, 
        banner: event.banner 
      },
      tickets: tickets.map((t) => ({
        ticketNumber: t.ticket_number,
        price: t.price,
        status: t.status,
        qrCode: t.qr_code,
      })),
      createdAt: payment.created_at,
    };
  }

  /**
   * Get organizer bookings (with privacy protection)
   */
  async getOrganizerBookings(organizerId, requesterRole, page = 1, limit = 20) {
    const pool = getMySQLPool();
    const offset = (page - 1) * limit;
    
    // Get bookings for organizer's events
    const [bookings] = await pool.query(
      `SELECT 
         b.*,
         u.name as customer_name,
         u.email as customer_email,
         u.phone as customer_phone,
         e.title as event_title,
         e.start_date as event_start_date,
         tt.name as ticket_type_name,
         p.amount as payment_amount,
         p.status as payment_status,
         p.transaction_id,
         p.created_at as payment_date
       FROM bookings b
       JOIN events e ON b.event_id = e.event_id
       JOIN users u ON b.user_id = u.user_id
       JOIN ticket_types tt ON b.ticket_type_id = tt.id
       LEFT JOIN payments p ON b.booking_id = p.booking_id
       WHERE e.organizer_id = ?
       ORDER BY b.created_at DESC
       LIMIT ? OFFSET ?`,
      [organizerId, parseInt(limit), offset]
    );
    
    // Get total count
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total
       FROM bookings b
       JOIN events e ON b.event_id = e.event_id
       WHERE e.organizer_id = ?`,
      [organizerId]
    );
    
    // Apply privacy masking based on requester role
    const maskedBookings = privacyService.maskBookingArray(bookings, requesterRole);
    
    // Log privacy access for audit
    privacyService.logPrivacyAccess(
      { id: organizerId, role: requesterRole },
      { type: 'organizer_bookings', count: bookings.length },
      requesterRole
    );
    
    return {
      bookings: maskedBookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        pages: Math.ceil(total / limit)
      },
      privacy: privacyService.getPrivacyNotice(requesterRole)
    };
  }

  /**
   * Get event attendees (with privacy protection)
   */
  async getEventAttendees(eventId, requesterRole, requesterId, page = 1, limit = 20) {
    const pool = getMySQLPool();
    const offset = (page - 1) * limit;
    
    // Verify access rights
    const [events] = await pool.query(
      'SELECT organizer_id FROM events WHERE event_id = ?',
      [eventId]
    );
    
    if (!events[0]) {
      throw new AppError('Event not found', 404);
    }
    
    const event = events[0];
    
    // Check if requester has access to this event's data
    if (requesterRole === 'organizer' && String(event.organizer_id) !== String(requesterId)) {
      throw new AppError('Access denied to this event data', 403);
    }
    
    // Get attendees
    const [attendees] = await pool.query(
      `SELECT 
         u.user_id,
         u.name as attendee_name,
         u.email as attendee_email,
         u.phone as attendee_phone,
         b.booking_number,
         b.quantity,
         b.total_amount,
         b.booking_status,
         b.created_at as booking_date,
         tt.name as ticket_type,
         COUNT(t.ticket_id) as tickets_count,
         GROUP_CONCAT(t.ticket_number) as ticket_numbers
       FROM bookings b
       JOIN users u ON b.user_id = u.user_id
       JOIN ticket_types tt ON b.ticket_type_id = tt.id
       LEFT JOIN tickets t ON b.booking_id = t.booking_id
       WHERE b.event_id = ? AND b.booking_status = 'confirmed'
       GROUP BY b.booking_id
       ORDER BY b.created_at DESC
       LIMIT ? OFFSET ?`,
      [eventId, parseInt(limit), offset]
    );
    
    // Get total count
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(DISTINCT b.booking_id) as total
       FROM bookings b
       WHERE b.event_id = ? AND b.booking_status = 'confirmed'`,
      [eventId]
    );
    
    // Apply privacy masking
    const maskedAttendees = privacyService.maskBookingArray(attendees, requesterRole);
    
    // Log privacy access for audit
    privacyService.logPrivacyAccess(
      { id: requesterId, role: requesterRole },
      { type: 'event_attendees', count: attendees.length, eventId },
      requesterRole
    );
    
    return {
      attendees: maskedAttendees,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        pages: Math.ceil(total / limit)
      },
      privacy: privacyService.getPrivacyNotice(requesterRole)
    };
  }
  async getAllBookings(userRole, page = 1, limit = 100, status = null, eventId = null) {
    const pool = getMySQLPool();
    const offset = (page - 1) * limit;
    
    // Build WHERE clause
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (status) {
      whereClause += ' AND b.booking_status = ?';
      params.push(status);
    }
    
    if (eventId) {
      whereClause += ' AND b.event_id = ?';
      params.push(eventId);
    }
    
    // Get bookings with user and event details
    const [bookings] = await pool.query(
      `SELECT 
         b.booking_id,
         b.booking_number,
         b.order_id,
         b.quantity,
         b.total_amount,
         b.booking_status,
         b.payment_status,
         b.created_at,
         u.user_id,
         u.name as user_name,
         u.email as user_email,
         u.phone as user_phone,
         e.event_id,
         e.title as event_title,
         e.start_date,
         e.venue_name,
         e.venue_city,
         e.type as event_type,
         COUNT(t.ticket_id) as ticket_count
       FROM bookings b
       JOIN users u ON b.user_id = u.user_id
       JOIN events e ON b.event_id = e.event_id
       LEFT JOIN tickets t ON b.booking_id = t.booking_id
       ${whereClause}
       GROUP BY b.booking_id
       ORDER BY b.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    
    // Get total count
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(DISTINCT b.booking_id) as total
       FROM bookings b
       ${whereClause}`,
      params
    );
    
    return {
      bookings: bookings.map(b => ({
        id: b.booking_id,
        orderId: b.order_id,
        bookingNumber: b.booking_number,
        status: b.booking_status,
        amount: b.total_amount,
        currency: 'INR',
        transactionId: b.order_id,
        event: {
          id: b.event_id,
          title: b.event_title,
          startDate: b.start_date,
          venue: `${b.venue_name}, ${b.venue_city}`,
          type: b.event_type
        },
        user: {
          id: b.user_id,
          name: b.user_name,
          email: b.user_email,
          phone: b.user_phone
        },
        totalTickets: b.ticket_count || 0,
        paymentStatus: b.payment_status,
        createdAt: b.created_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getUserBookings(userId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const payments = await paymentRepository.findByUserId(userId, limit, offset);

    const bookings = await Promise.all(
      payments.map(async (payment) => {
        const pool = getMySQLPool();
        const [tickets] = await pool.query(
          `SELECT ticket_number, ticket_type, price, status, qr_code
           FROM tickets
           WHERE payment_id = ?
           ORDER BY ticket_id ASC`,
          [payment.payment_id]
        );
        const event = payment.event_id
          ? await eventRepository.findById(payment.event_id)
          : null;
        
        return {
          orderId: payment.order_id,
          status: payment.status,
          amount: payment.amount,
          transactionId: payment.transaction_id,
          event: {
            id: event?.event_id ?? payment.event_id,
            title: event?.title ?? payment.event_title ?? 'Event details unavailable',
            startDate: event?.start_date ?? payment.event_date ?? payment.created_at,
            venue: {
              name: event?.venue_name ?? 'Venue pending',
              city: event?.venue_city ?? '',
            },
            banner: event?.banner ?? null,
          },
          tickets: tickets.map((ticket) => ({
            ticketNumber: ticket.ticket_number,
            ticketType: ticket.ticket_type || 'Entry Pass',
            price: Number(ticket.price || 0),
            status: ticket.status || 'active',
            qrCode: ticket.qr_code || '',
          })),
          ticketCount: tickets.length,
          createdAt: payment.created_at,
        };
      })
    );

    return { bookings, page, limit };
  }
}

module.exports = new BookingService();

