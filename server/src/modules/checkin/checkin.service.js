const { AppError } = require('../../middleware/errorHandler');
const { getMySQLPool } = require('../../database/mysql');
const logger = require('../../utils/logger');

const resolveTicket = async (pool, { ticketId, ticketNumber, qrData }) => {
  // Parse QR JSON payload if provided
  if (qrData && !ticketNumber && !ticketId) {
    try {
      const parsed = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
      ticketNumber = parsed.ticket_number || parsed.ticketNumber || null;
      ticketId     = parsed.ticket_id   || parsed.ticketId     || null;
    } catch {
      ticketNumber = qrData; // treat raw string as ticket number
    }
  }

  if (!ticketId && !ticketNumber) {
    throw new AppError('ticketId, ticketNumber, or qrData is required', 400);
  }

  const col = ticketId ? 't.ticket_id = ?' : 't.ticket_number = ?';
  const val = ticketId || ticketNumber;

  const [rows] = await pool.query(
    `SELECT t.ticket_id, t.ticket_number, t.ticket_type, t.status,
            b.booking_id, b.booking_status, b.event_id,
            u.user_id, u.name AS user_name, u.email, u.phone
     FROM tickets t
     JOIN bookings b ON t.booking_id = b.booking_id
     JOIN users   u ON t.user_id     = u.user_id
     WHERE ${col}`,
    [val]
  );

  return rows[0] || null;
};

const checkInTicket = async (eventId, checkinData, user) => {
  const pool = getMySQLPool();
  const ticket = await resolveTicket(pool, checkinData);

  if (!ticket) throw new AppError('Ticket not found', 404);

  if (String(ticket.event_id) !== String(eventId)) {
    throw new AppError('Ticket belongs to a different event', 400);
  }

  // Already checked in?
  const [[existing]] = await pool.query(
    'SELECT id, checked_in_at, checked_by FROM check_ins WHERE ticket_id = ?',
    [ticket.ticket_id]
  );

  if (existing) {
    return {
      status: 'already_used',
      message: 'Ticket has already been checked in',
      checkin: {
        id: existing.id,
        checkedInAt: existing.checked_in_at,
        checkedBy: existing.checked_by,
      },
      ticket: {
        ticketNumber: ticket.ticket_number,
        userName: ticket.user_name,
        email: ticket.email,
        phone: ticket.phone,
        ticketType: ticket.ticket_type,
      },
    };
  }

  if (ticket.booking_status !== 'confirmed') {
    throw new AppError(`Booking is not confirmed (status: ${ticket.booking_status})`, 400);
  }

  if (ticket.status === 'cancelled') throw new AppError('Ticket has been cancelled', 400);
  if (ticket.status === 'expired')   throw new AppError('Ticket has expired', 400);

  const { scannerId = null, notes = null } = checkinData;

  const [result] = await pool.execute(
    `INSERT INTO check_ins
       (ticket_id, booking_id, event_id, user_id, checked_by, checked_by_role, scanner_id, notes, checked_in_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      ticket.ticket_id,
      ticket.booking_id,
      ticket.event_id,
      ticket.user_id,
      user.id,
      user.role,
      scannerId,
      notes,
    ]
  );

  // Mark ticket as used
  await pool.execute(
    "UPDATE tickets SET status = 'used', checked_in = 1, checked_in_at = NOW() WHERE ticket_id = ?",
    [ticket.ticket_id]
  );

  logger.info('Ticket checked in', {
    ticketId: ticket.ticket_id,
    ticketNumber: ticket.ticket_number,
    eventId,
    checkedBy: user.id,
  });

  return {
    status: 'success',
    message: 'Ticket checked in successfully',
    checkin: {
      id: result.insertId,
      ticketId: ticket.ticket_id,
      ticketNumber: ticket.ticket_number,
      userName: ticket.user_name,
      email: ticket.email,
      phone: ticket.phone,
      ticketType: ticket.ticket_type,
      checkedInAt: new Date(),
      checkedBy: user.id,
      scannerId,
    },
  };
};

const validateTicket = async (eventId, { ticketNumber, qrData }) => {
  const pool = getMySQLPool();
  const ticket = await resolveTicket(pool, { ticketNumber, qrData });

  if (!ticket) return { valid: false, reason: 'Ticket not found' };
  if (String(ticket.event_id) !== String(eventId))
    return { valid: false, reason: 'Ticket belongs to a different event' };
  if (ticket.booking_status !== 'confirmed')
    return { valid: false, reason: `Booking not confirmed (${ticket.booking_status})` };
  if (ticket.status === 'cancelled') return { valid: false, reason: 'Ticket cancelled' };
  if (ticket.status === 'expired')   return { valid: false, reason: 'Ticket expired' };

  const [[existing]] = await pool.query(
    'SELECT checked_in_at FROM check_ins WHERE ticket_id = ?',
    [ticket.ticket_id]
  );

  if (existing) {
    return {
      valid: false,
      alreadyUsed: true,
      reason: 'Ticket already checked in',
      checkedInAt: existing.checked_in_at,
      ticket: { ticketNumber: ticket.ticket_number, userName: ticket.user_name, ticketType: ticket.ticket_type },
    };
  }

  return {
    valid: true,
    ticket: {
      ticketNumber: ticket.ticket_number,
      userName: ticket.user_name,
      email: ticket.email,
      phone: ticket.phone,
      ticketType: ticket.ticket_type,
    },
  };
};

const checkInBatch = async (eventId, { tickets, scannerId, notes }, user) => {
  const results = await Promise.allSettled(
    tickets.map((t) => checkInTicket(eventId, { ...t, scannerId, notes }, user))
  );

  const mapped = results.map((r, i) => ({
    ticketId: tickets[i].ticketId || tickets[i].ticketNumber,
    success: r.status === 'fulfilled' && r.value.status === 'success',
    message: r.status === 'fulfilled' ? r.value.message : r.reason?.message,
    checkin: r.status === 'fulfilled' ? r.value.checkin : null,
  }));

  return {
    total: mapped.length,
    successful: mapped.filter((r) => r.success).length,
    failed: mapped.filter((r) => !r.success).length,
    results: mapped,
  };
};

const getEventCheckins = async (eventId, filters = {}) => {
  const pool = getMySQLPool();
  const page   = parseInt(filters.page)  || 1;
  const limit  = parseInt(filters.limit) || 20;
  const offset = (page - 1) * limit;

  const params = [eventId];
  let where = 'WHERE ci.event_id = ?';

  if (filters.fromDate) { where += ' AND ci.checked_in_at >= ?'; params.push(filters.fromDate); }
  if (filters.toDate)   { where += ' AND ci.checked_in_at <= ?'; params.push(filters.toDate); }

  const [checkins] = await pool.query(
    `SELECT ci.id, ci.ticket_id, ci.checked_in_at, ci.checked_by, ci.checked_by_role, ci.scanner_id, ci.notes,
            t.ticket_number, t.ticket_type,
            u.name AS user_name, u.email, u.phone, u.user_id
     FROM check_ins ci
     JOIN tickets t ON ci.ticket_id = t.ticket_id
     JOIN users   u ON ci.user_id   = u.user_id
     ${where}
     ORDER BY ci.checked_in_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) AS total FROM check_ins WHERE event_id = ?',
    [eventId]
  );

  return {
    checkins: checkins.map((c) => ({
      id: c.id,
      ticketId: c.ticket_id,
      ticketNumber: c.ticket_number,
      ticketType: c.ticket_type,
      userName: c.user_name,
      email: c.email,
      phone: c.phone,
      checkedInAt: c.checked_in_at,
      checkedBy: c.checked_by,
      checkedByRole: c.checked_by_role,
      scannerId: c.scanner_id,
      notes: c.notes,
    })),
    pagination: { page, limit, total: parseInt(total), pages: Math.ceil(total / limit) },
  };
};

const getCheckinStats = async (eventId) => {
  const pool = getMySQLPool();

  const [[{ totalTickets }]] = await pool.query(
    `SELECT COUNT(*) AS totalTickets
     FROM tickets t
     JOIN bookings b ON t.booking_id = b.booking_id
     WHERE b.event_id = ? AND b.booking_status = 'confirmed'`,
    [eventId]
  );

  const [[{ checkedIn }]] = await pool.query(
    'SELECT COUNT(*) AS checkedIn FROM check_ins WHERE event_id = ?',
    [eventId]
  );

  const [byHour] = await pool.query(
    `SELECT HOUR(checked_in_at) AS hour, COUNT(*) AS count
     FROM check_ins
     WHERE event_id = ? AND DATE(checked_in_at) = CURDATE()
     GROUP BY HOUR(checked_in_at)
     ORDER BY hour`,
    [eventId]
  );

  const [byScanner] = await pool.query(
    `SELECT scanner_id, COUNT(*) AS count
     FROM check_ins
     WHERE event_id = ?
     GROUP BY scanner_id
     ORDER BY count DESC`,
    [eventId]
  );

  return {
    totalTickets: parseInt(totalTickets),
    checkedIn: parseInt(checkedIn),
    notCheckedIn: parseInt(totalTickets) - parseInt(checkedIn),
    checkinRate: totalTickets > 0
      ? ((checkedIn / totalTickets) * 100).toFixed(1)
      : '0.0',
    byHour: byHour.map((h) => ({ hour: h.hour, count: h.count })),
    byScanner: byScanner.map((s) => ({ scannerId: s.scanner_id, count: s.count })),
  };
};

const getTicketCheckin = async (ticketId) => {
  const pool = getMySQLPool();

  const [rows] = await pool.query(
    `SELECT ci.id, ci.ticket_id, ci.checked_in_at, ci.checked_by, ci.checked_by_role, ci.scanner_id, ci.notes,
            t.ticket_number, t.ticket_type,
            u.name AS user_name, u.email, u.phone
     FROM check_ins ci
     JOIN tickets t ON ci.ticket_id = t.ticket_id
     JOIN users   u ON ci.user_id   = u.user_id
     WHERE ci.ticket_id = ?`,
    [ticketId]
  );

  if (!rows[0]) return null;
  const c = rows[0];
  return {
    id: c.id,
    ticketId: c.ticket_id,
    ticketNumber: c.ticket_number,
    ticketType: c.ticket_type,
    userName: c.user_name,
    email: c.email,
    phone: c.phone,
    checkedInAt: c.checked_in_at,
    checkedBy: c.checked_by,
    checkedByRole: c.checked_by_role,
    scannerId: c.scanner_id,
    notes: c.notes,
  };
};

module.exports = {
  checkInTicket,
  checkInBatch,
  validateTicket,
  getEventCheckins,
  getCheckinStats,
  getTicketCheckin,
};
