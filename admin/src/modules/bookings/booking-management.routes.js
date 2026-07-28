const express = require('express');
const { getMySQLPool } = require('../../database/mysql');
const { authenticate, authorize } = require('../../middleware/rbac');

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin', 'super_admin'));

router.get('/', async (req, res, next) => {
  try {
    const pool = getMySQLPool();
    const { page = 1, limit = 20, status, eventId, userId } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const params = [];
    let where = 'WHERE 1=1';

    if (status) {
      where += ' AND b.booking_status = ?';
      params.push(status);
    }
    if (eventId) {
      where += ' AND b.event_id = ?';
      params.push(eventId);
    }
    if (userId) {
      where += ' AND b.user_id = ?';
      params.push(userId);
    }

    const [bookings] = await pool.query(
      `SELECT b.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
              e.title AS event_title, e.start_date AS event_date, e.type AS event_type,
              e.venue_name, e.venue_city, e.venue_state,
              p.order_id, p.transaction_id, p.status AS gateway_payment_status,
              p.amount AS payment_amount, p.currency,
              COALESCE((SELECT COUNT(*) FROM tickets t WHERE t.booking_id = b.booking_id), b.quantity) AS total_tickets
       FROM bookings b
       LEFT JOIN users u ON b.user_id = u.user_id
       LEFT JOIN events e ON b.event_id = e.event_id
       LEFT JOIN payments p ON p.booking_id = b.booking_id
       ${where}
       ORDER BY b.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    const [[count]] = await pool.query(`SELECT COUNT(*) AS total FROM bookings b ${where}`, params);

    res.json({
      success: true,
      data: bookings.map(mapBookingRow),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count.total,
        pages: Math.ceil(count.total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const pool = getMySQLPool();
    const [bookings] = await pool.query(
      `SELECT b.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
              e.title AS event_title, e.start_date AS event_date, e.type AS event_type,
              e.venue_name, e.venue_city, e.venue_state,
              p.order_id, p.transaction_id, p.status AS gateway_payment_status,
              p.amount AS payment_amount, p.currency,
              COALESCE((SELECT COUNT(*) FROM tickets t WHERE t.booking_id = b.booking_id), b.quantity) AS total_tickets
       FROM bookings b
       LEFT JOIN users u ON b.user_id = u.user_id
       LEFT JOIN events e ON b.event_id = e.event_id
       LEFT JOIN payments p ON p.booking_id = b.booking_id
       WHERE b.booking_id = ? OR b.booking_number = ?`,
      [req.params.id, req.params.id]
    );

    if (!bookings.length) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.json({ success: true, data: mapBookingRow(bookings[0]) });
  } catch (error) {
    next(error);
  }
});

function mapBookingRow(row) {
  return {
    id: row.booking_id,
    bookingId: row.booking_id,
    orderId: row.order_id,
    bookingNumber: row.booking_number,
    status: row.booking_status,
    amount: row.payment_amount || row.total_amount,
    currency: row.currency || 'INR',
    transactionId: row.transaction_id,
    event: {
      id: row.event_id,
      title: row.event_title,
      startDate: row.event_date,
      venue: row.event_type === 'online' ? 'Online Event' : [row.venue_name, row.venue_city, row.venue_state].filter(Boolean).join(', '),
      type: row.event_type,
    },
    user: {
      id: row.user_id,
      name: row.user_name,
      email: row.user_email,
      phone: row.user_phone,
    },
    totalTickets: row.total_tickets,
    paymentStatus: row.gateway_payment_status || row.payment_status,
    bookingMethod: row.booking_method,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = router;
