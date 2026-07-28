const pool = require('../database/mysql');
const QRCode = require('qrcode');

const getApiBaseUrl = () => {
  const configured = process.env.API_URL || 'https://api.buizz.com';
  return String(configured).replace(/\/+$/, '').replace(/\/api\/v1$/i, '');
};

class TicketRepository {
  async create(ticketData) {
    const connection = await pool.getConnection();
    try {
      const {
        ticket_number,
        booking_id,
        event_id,
        user_id,
        payment_id,
        ticket_type_id,
        ticket_type,
        price,
        status = 'active'
      } = ticketData;

      // Keep QR payload scanner-friendly and avoid double /api/v1 when API_URL already includes it.
      const qrData = `${getApiBaseUrl()}/api/v1/qr/redirect/${encodeURIComponent(ticket_number)}`;
      const qr_code = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'H',
        margin: 3,
        width: 512,
        color: { dark: '#090a0d', light: '#ffffff' }
      });

      const [result] = await connection.execute(
        `INSERT INTO tickets (ticket_number, booking_id, payment_id, event_id, user_id, ticket_type_id, ticket_type, price, qr_code, qr_data, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [ticket_number, booking_id || null, payment_id, event_id, user_id, ticket_type_id || null, ticket_type || null, price, qr_code, qrData, status]
      );

      return { id: result.insertId, ticket_id: result.insertId, ...ticketData, qr_code, qr_data: qrData };
    } finally {
      connection.release();
    }
  }

  async findByTicketNumber(ticketNumber) {
    const [rows] = await pool.execute(
      `SELECT t.*, e.title as event_title, e.start_date as event_date, e.venue_name, e.venue_address,
              u.name as user_name, u.email as user_email, u.phone as user_phone,
              p.order_id, p.transaction_id
       FROM tickets t
       LEFT JOIN events e ON t.event_id = e.event_id
       LEFT JOIN users u ON t.user_id = u.user_id
       LEFT JOIN payments p ON t.payment_id = p.payment_id
       WHERE t.ticket_number = ?`,
      [ticketNumber]
    );
    return rows[0];
  }

  async findById(ticketId) {
    const [rows] = await pool.execute(
      `SELECT t.*, e.title as event_title, e.start_date as event_date, e.venue_name, e.venue_address,
              u.name as user_name, u.email as user_email, u.phone as user_phone,
              p.order_id, p.transaction_id
       FROM tickets t
       LEFT JOIN events e ON t.event_id = e.event_id
       LEFT JOIN users u ON t.user_id = u.user_id
       LEFT JOIN payments p ON t.payment_id = p.payment_id
       WHERE t.ticket_id = ?`,
      [ticketId]
    );
    return rows[0];
  }

  async findByUserId(userId, limit = 20, offset = 0) {
    const connection = await pool.getConnection();
    try {
      connection.queryTimeout = 10000; // 10 second timeout
      const [rows] = await connection.execute(
        `SELECT t.ticket_id, t.ticket_number, t.booking_id, t.payment_id, t.event_id, t.user_id,
                t.ticket_type_id, t.ticket_type, t.price, t.qr_code, t.qr_data, t.status,
                t.checked_in, t.checked_in_at, t.created_at, t.updated_at,
                e.title as event_title, e.start_date as event_date, e.venue_name, e.banner,
                e.venue_city, e.venue_state, e.type as event_type
         FROM tickets t
         LEFT JOIN events e ON t.event_id = e.event_id
         WHERE t.user_id = ?
         ORDER BY t.created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      );
      return rows;
    } finally {
      connection.release();
    }
  }

  async findByPaymentId(paymentId) {
    const [rows] = await pool.execute(
      `SELECT t.*, e.title as event_title, e.start_date as event_date, e.venue_name
       FROM tickets t
       LEFT JOIN events e ON t.event_id = e.event_id
       WHERE t.payment_id = ?`,
      [paymentId]
    );
    return rows;
  }

  async findByEventId(eventId, limit = 50, offset = 0) {
    const [rows] = await pool.execute(
      `SELECT t.*, u.name as user_name, u.email as user_email, u.phone as user_phone
       FROM tickets t
       LEFT JOIN users u ON t.user_id = u.user_id
       WHERE t.event_id = ?
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [eventId, limit, offset]
    );
    return rows;
  }

  async updateStatus(ticketNumber, status) {
    const [result] = await pool.execute(
      'UPDATE tickets SET status = ?, updated_at = NOW() WHERE ticket_number = ?',
      [status, ticketNumber]
    );
    return result.affectedRows > 0;
  }

  async scanTicket(ticketNumber, scannedBy) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.execute(
        'UPDATE tickets SET status = ?, checked_in = 1, checked_in_at = NOW(), scanned_by = ? WHERE ticket_number = ? AND status = ?',
        ['used', scannedBy, ticketNumber, 'active']
      );

      if (result.affectedRows > 0) {
        const [ticket] = await connection.execute('SELECT ticket_id FROM tickets WHERE ticket_number = ?', [ticketNumber]);
        
        await connection.execute(
          'INSERT INTO qr_scans (ticket_id, scanned_by) VALUES (?, ?)',
          [ticket[0].ticket_id, scannedBy]
        );
      }

      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async generateTicketNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${timestamp}${random}`;
  }
}

module.exports = new TicketRepository();
