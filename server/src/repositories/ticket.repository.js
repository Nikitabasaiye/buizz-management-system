const pool = require('../database/mysql');
const QRCode = require('qrcode');

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

      const qrData = JSON.stringify({ ticket_number, event_id, user_id, booking_id, payment_id });
      const qr_code = await QRCode.toDataURL(qrData);

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

  async findByUserId(userId, limit = 20, offset = 0) {
    const [rows] = await pool.execute(
      `SELECT t.*, e.title as event_title, e.start_date as event_date, e.venue_name, e.banner
       FROM tickets t
       LEFT JOIN events e ON t.event_id = e.event_id
       WHERE t.user_id = ?
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    return rows;
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
    const prefix = 'TKT';
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}${timestamp}${random}`;
  }
}

module.exports = new TicketRepository();
