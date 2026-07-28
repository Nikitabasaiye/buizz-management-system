const { getMySQLPool } = require('../../database/mysql');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');
const { TICKET_STATUS } = require('../../constants');

class TicketScanService {
  async assertEventAccess(pool, eventId, user, permission = 'scan') {
    if (['admin', 'super_admin', 'super-admin'].includes(user.role)) return true;

    if (user.role === 'organizer') {
      const [events] = await pool.query(
        'SELECT event_id FROM events WHERE event_id = ? AND organizer_id = ?',
        [eventId, user.id]
      );
      if (events.length) return true;
    }

    const [staffAssignments] = await pool.query(
      'SELECT id, permissions FROM event_checkin_staff WHERE event_id = ? AND staff_id = ? AND is_active = 1',
      [eventId, user.id]
    );
    if (!staffAssignments.length) {
      throw new AppError('You are not authorized for check-in on this event', 403);
    }

    const permissions = JSON.parse(staffAssignments[0].permissions || '{}');
    if (!permissions[permission]) {
      throw new AppError(`You do not have permission to ${permission} tickets`, 403);
    }

    return true;
  }

  /**
   * Scan and verify ticket QR code
   * @param {string} ticketNumber - Ticket number
   * @param {Object} user - Authenticated scanner user
   * @param {Object} scanData - Scan data (location, device_info, etc.)
   * @returns {Promise<Object>} Scan result with ticket details
   */
  async scanTicket(ticketNumber, user, scanData = {}) {
    const pool = getMySQLPool();

    // Find ticket
    const [tickets] = await pool.query(
      `SELECT 
        t.ticket_id,
        t.ticket_number,
        t.booking_id,
        t.payment_id,
        t.event_id,
        t.user_id,
        t.ticket_type_id,
        t.price,
        t.status,
        t.checked_in,
        t.checked_in_at,
        t.qr_data,
        b.booking_number,
        b.quantity,
        e.title as event_title,
        e.start_date as event_start,
        e.end_date as event_end,
        e.venue_name,
        e.venue_address,
        u.name as attendee_name,
        u.email as attendee_email,
        u.phone as attendee_phone,
        tt.name as ticket_type_name
       FROM tickets t
       JOIN bookings b ON t.booking_id = b.booking_id
       JOIN events e ON t.event_id = e.event_id
       JOIN users u ON t.user_id = u.user_id
       JOIN ticket_types tt ON t.ticket_type_id = tt.id
       WHERE t.ticket_number = ?`,
      [ticketNumber]
    );

    if (!tickets.length) {
      throw new AppError('Ticket not found', 404);
    }

    const ticket = tickets[0];

    // Check if ticket is already used
    if (ticket.checked_in === 1) {
      return {
        success: false,
        message: 'Ticket already used',
        ticket: {
          ticketNumber: ticket.ticket_number,
          attendeeName: ticket.attendee_name,
          eventTitle: ticket.event_title,
          checkedInAt: ticket.checked_in_at,
          status: 'already_used'
        }
      };
    }

    // Check if ticket is active
    if (ticket.status !== TICKET_STATUS.ACTIVE) {
      return {
        success: false,
        message: `Ticket is ${ticket.status}`,
        ticket: {
          ticketNumber: ticket.ticket_number,
          attendeeName: ticket.attendee_name,
          eventTitle: ticket.event_title,
          status: ticket.status
        }
      };
    }

    await this.assertEventAccess(pool, ticket.event_id, user, 'scan');

    // Check if event is happening today or within valid timeframe
    const eventStart = new Date(ticket.event_start);
    const eventEnd = new Date(ticket.event_end);
    const now = new Date();
    
    // Allow scanning 2 hours before event start until event end
    const scanStart = new Date(eventStart);
    scanStart.setHours(scanStart.getHours() - 2);
    
    if (now < scanStart) {
      return {
        success: false,
        message: 'Event has not started yet. Scanning allowed 2 hours before event start.',
        ticket: {
          ticketNumber: ticket.ticket_number,
          attendeeName: ticket.attendee_name,
          eventTitle: ticket.event_title,
          eventStart: ticket.event_start,
          status: 'too_early'
        }
      };
    }

    if (now > eventEnd) {
      return {
        success: false,
        message: 'Event has already ended',
        ticket: {
          ticketNumber: ticket.ticket_number,
          attendeeName: ticket.attendee_name,
          eventTitle: ticket.event_title,
          eventEnd: ticket.event_end,
          status: 'event_ended'
        }
      };
    }

    // Mark ticket as checked in
    await pool.execute(
      `UPDATE tickets 
       SET checked_in = 1, checked_in_at = NOW(), scanned_by = ?
       WHERE ticket_id = ?`,
      [user.id, ticket.ticket_id]
    );

    // Log scan in qr_scans table
    await pool.execute(
      `INSERT INTO qr_scans (ticket_id, scanned_by, device_info)
       VALUES (?, ?, ?)`,
      [
        ticket.ticket_id,
        user.id,
        scanData.device_info || scanData.location || null
      ]
    );

    // Update check-in staff performance
    const today = new Date().toISOString().split('T')[0];
    await pool.execute(
      `INSERT INTO checkin_staff_performance (staff_id, event_id, date, tickets_scanned)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE 
       tickets_scanned = tickets_scanned + 1,
       shift_end = NOW()`,
      [user.id, ticket.event_id, today]
    );

    logger.info('Ticket scanned successfully', { 
      ticketNumber, 
      staffId: user.id, 
      eventId: ticket.event_id 
    });

    return {
      success: true,
      message: 'Ticket verified successfully',
      ticket: {
        ticketId: ticket.ticket_id,
        ticketNumber: ticket.ticket_number,
        bookingNumber: ticket.booking_number,
        attendeeName: ticket.attendee_name,
        attendeeEmail: ticket.attendee_email,
        attendeePhone: ticket.attendee_phone,
        eventTitle: ticket.event_title,
        eventStart: ticket.event_start,
        eventEnd: ticket.event_end,
        venueName: ticket.venue_name,
        venueAddress: ticket.venue_address,
        ticketTypeName: ticket.ticket_type_name,
        price: ticket.price,
        checkedInAt: new Date(),
        status: 'verified'
      }
    };
  }

  /**
   * Get scan statistics for an event
   * @param {number} eventId - Event ID
   * @param {number} staffId - Staff user ID
   * @returns {Promise<Object>} Scan statistics
   */
  async getEventScanStats(eventId, user) {
    const pool = getMySQLPool();

    await this.assertEventAccess(pool, eventId, user, 'view');

    // Get statistics
    const [stats] = await pool.query(
      `SELECT 
        COUNT(DISTINCT t.user_id) as total_attendees,
        COUNT(t.ticket_id) as total_tickets,
        SUM(CASE WHEN t.checked_in = 1 THEN 1 ELSE 0 END) as checked_in_tickets,
        SUM(CASE WHEN t.checked_in = 0 THEN 1 ELSE 0 END) as pending_tickets,
        SUM(CASE WHEN t.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_tickets
       FROM tickets t
       WHERE t.event_id = ?`,
      [eventId]
    );

    // Get staff performance
    const [performance] = await pool.query(
      `SELECT 
        tickets_scanned,
        tickets_verified,
        tickets_rejected,
        average_scan_time,
        shift_start,
        shift_end
       FROM checkin_staff_performance
      WHERE event_id = ? AND staff_id = ? AND date = CURDATE()`,
      [eventId, user.id]
    );

    return {
      event: {
        eventId,
        totalAttendees: stats[0].total_attendees || 0,
        totalTickets: stats[0].total_tickets || 0,
        checkedInTickets: stats[0].checked_in_tickets || 0,
        pendingTickets: stats[0].pending_tickets || 0,
        cancelledTickets: stats[0].cancelled_tickets || 0,
        checkInRate: stats[0].total_tickets > 0 
          ? ((stats[0].checked_in_tickets / stats[0].total_tickets) * 100).toFixed(2) 
          : 0
      },
      staff: performance[0] || {
        ticketsScanned: 0,
        ticketsVerified: 0,
        ticketsRejected: 0,
        averageScanTime: null,
        shiftStart: null,
        shiftEnd: null
      }
    };
  }

  /**
   * Get recent scans for an event
   * @param {number} eventId - Event ID
   * @param {number} staffId - Staff user ID
   * @param {number} limit - Number of records
   * @returns {Promise<Array>} Recent scans
   */
  async getRecentScans(eventId, user, limit = 50) {
    const pool = getMySQLPool();

    await this.assertEventAccess(pool, eventId, user, 'view');

    const [scans] = await pool.query(
      `SELECT 
        qs.id,
        qs.scanned_at,
        qs.device_info,
        t.ticket_number,
        t.checked_in,
        u.name as attendee_name,
        s.name as scanner_name
       FROM qr_scans qs
       JOIN tickets t ON qs.ticket_id = t.ticket_id
       JOIN users u ON t.user_id = u.user_id
       JOIN users s ON qs.scanned_by = s.user_id
       WHERE t.event_id = ?
       ORDER BY qs.scanned_at DESC
       LIMIT ?`,
      [eventId, limit]
    );

    return scans;
  }

  /**
   * Verify ticket without scanning (view only)
   * @param {string} ticketNumber - Ticket number
   * @param {number} staffId - Staff user ID
   * @returns {Promise<Object>} Ticket details
   */
  async verifyTicket(ticketNumber, user) {
    const pool = getMySQLPool();

    // Find ticket
    const [tickets] = await pool.query(
      `SELECT 
        t.ticket_id,
        t.ticket_number,
        t.booking_id,
        t.event_id,
        t.user_id,
        t.status,
        t.checked_in,
        t.checked_in_at,
        e.title as event_title,
        e.start_date as event_start,
        e.end_date as event_end,
        u.name as attendee_name,
        u.email as attendee_email,
        tt.name as ticket_type_name
       FROM tickets t
       JOIN events e ON t.event_id = e.event_id
       JOIN users u ON t.user_id = u.user_id
       JOIN ticket_types tt ON t.ticket_type_id = tt.id
       WHERE t.ticket_number = ?`,
      [ticketNumber]
    );

    if (!tickets.length) {
      throw new AppError('Ticket not found', 404);
    }

    const ticket = tickets[0];

    await this.assertEventAccess(pool, ticket.event_id, user, 'view');

    return {
      ticketNumber: ticket.ticket_number,
      attendeeName: ticket.attendee_name,
      attendeeEmail: ticket.attendee_email,
      eventTitle: ticket.event_title,
      eventStart: ticket.event_start,
      eventEnd: ticket.event_end,
      ticketTypeName: ticket.ticket_type_name,
      status: ticket.status,
      checkedIn: ticket.checked_in === 1,
      checkedInAt: ticket.checked_in_at
    };
  }
}

module.exports = new TicketScanService();
