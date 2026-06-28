const pool = require('../database/mysql');

class PaymentRepository {
  async create(paymentData) {
    const connection = await pool.getConnection();
    try {
      const {
        booking_id,
        user_id,
        event_id,
        order_id,
        amount,
        currency = 'INR',
        status = 'pending',
        payment_method = 'phonepe',
        metadata = {}
      } = paymentData;

      const [result] = await connection.execute(
        `INSERT INTO payments (booking_id, user_id, event_id, order_id, amount, currency, status, payment_method, gateway_response)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [booking_id || null, user_id, event_id, order_id, amount, currency, status, payment_method, JSON.stringify(metadata)]
      );

      return { id: result.insertId, ...paymentData };
    } finally {
      connection.release();
    }
  }

  async findByOrderId(orderId) {
    const [rows] = await pool.execute(
      'SELECT * FROM payments WHERE order_id = ?',
      [orderId]
    );
    return rows[0];
  }

  async findById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM payments WHERE payment_id = ?',
      [id]
    );
    return rows[0];
  }

  async updateStatus(orderId, updateData) {
    const connection = await pool.getConnection();
    try {
      const { status, transaction_id, payment_method, metadata } = updateData;
      
      const [result] = await connection.execute(
        `UPDATE payments 
         SET status = ?, transaction_id = ?, payment_method = ?, gateway_response = ?, updated_at = NOW()
         WHERE order_id = ?`,
        [status, transaction_id, payment_method, JSON.stringify(metadata), orderId]
      );

      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  async findByUserId(userId, limit = 10, offset = 0) {
    const [rows] = await pool.execute(
      `SELECT p.*, e.title as event_title, e.start_date as event_date
       FROM payments p
       LEFT JOIN events e ON p.event_id = e.event_id
       WHERE p.user_id = ?
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    return rows;
  }

  async findByEventId(eventId, limit = 50, offset = 0) {
    const [rows] = await pool.execute(
      `SELECT p.*, u.name as user_name, u.email as user_email
       FROM payments p
       LEFT JOIN users u ON p.user_id = u.user_id
       WHERE p.event_id = ? AND p.status = 'completed'
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [eventId, limit, offset]
    );
    return rows;
  }

  async getTotalRevenue(eventId) {
    const [rows] = await pool.execute(
      `SELECT SUM(amount) as total_revenue, COUNT(*) as total_payments
       FROM payments
       WHERE event_id = ? AND status = 'completed'`,
      [eventId]
    );
    return rows[0];
  }
}

module.exports = new PaymentRepository();
