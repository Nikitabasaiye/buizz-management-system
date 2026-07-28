const { getMySQLPool } = require('../database/mysql');
const paymentHistoryRepository = require('./paymentHistory.repository');

class PaymentRepository {
  async create(paymentData) {
    const pool = getMySQLPool();
    const {
      booking_id,
      user_id,
      event_id,
      order_id,
      amount,
      currency = 'INR',
      status = 'pending',
      payment_method = 'phonepe',
      metadata = {},
    } = paymentData;

    const [result] = await pool.execute(
      `INSERT INTO payments (booking_id, user_id, event_id, order_id, amount, currency, status, payment_method, gateway_response)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [booking_id || null, user_id, event_id, order_id, amount, currency, status, payment_method, JSON.stringify(metadata)]
    );

    // Record initial history entry
    await paymentHistoryRepository.record({
      paymentId: result.insertId,
      orderId: order_id,
      userId: user_id,
      eventId: event_id,
      bookingId: booking_id || null,
      gateway: payment_method,
      fromStatus: null,
      toStatus: status,
      amount,
      currency,
      source: 'create',
      rawPayload: metadata,
    }).catch(() => {}); // never block payment creation

    return { id: result.insertId, ...paymentData };
  }

  async findByOrderId(orderId) {
    const pool = getMySQLPool();
    const [rows] = await pool.execute(
      'SELECT * FROM payments WHERE order_id = ?',
      [orderId]
    );
    return rows[0];
  }

  async findById(id) {
    const pool = getMySQLPool();
    const [rows] = await pool.execute(
      'SELECT * FROM payments WHERE payment_id = ?',
      [id]
    );
    return rows[0];
  }

  async findByRazorpayOrderId(razorpayOrderId) {
    const pool = getMySQLPool();
    // razorpayOrderId is stored in gateway_response JSON and also in a dedicated column after first verify
    const [rows] = await pool.execute(
      `SELECT * FROM payments WHERE razorpay_order_id = ?`,
      [razorpayOrderId]
    );
    if (rows[0]) return rows[0];

    // Fallback: scan gateway_response JSON (slower, only used if column not yet populated)
    const [fallback] = await pool.execute(
      `SELECT * FROM payments
       WHERE JSON_UNQUOTE(JSON_EXTRACT(gateway_response, '$.razorpayOrderId')) = ?`,
      [razorpayOrderId]
    );
    return fallback[0];
  }

  async updateStatus(orderId, updateData, { ipAddress, userAgent, source = 'api' } = {}) {
    const pool = getMySQLPool();
    const { status, transaction_id, payment_method, metadata } = updateData;

    // Fetch current status for history
    const current = await this.findByOrderId(orderId);
    const fromStatus = current?.status || null;

    const updateFields = [
      'status = ?',
      'transaction_id = ?',
      'payment_method = ?',
      'gateway_response = ?',
      'updated_at = NOW()',
    ];
    const values = [status, transaction_id, payment_method, JSON.stringify(metadata)];

    // Store razorpay_order_id in dedicated column when available
    const razorpayOrderId = metadata?.razorpayOrderId;
    if (razorpayOrderId) {
      updateFields.push('razorpay_order_id = ?');
      values.push(razorpayOrderId);
    }

    values.push(orderId);

    const [result] = await pool.execute(
      `UPDATE payments SET ${updateFields.join(', ')} WHERE order_id = ?`,
      values
    );

    // Detect gateway from payment_method string
    const gateway = (payment_method || '').startsWith('razorpay') ? 'razorpay' : 'phonepe';

    // Record history entry for every status change
    await paymentHistoryRepository.record({
      paymentId: current?.payment_id,
      orderId,
      userId: current?.user_id,
      eventId: current?.event_id,
      bookingId: current?.booking_id,
      gateway,
      gatewayOrderId: razorpayOrderId || metadata?.merchantTransactionId || null,
      gatewayPaymentId: transaction_id || metadata?.razorpayPaymentId || metadata?.phonePeTransactionId || null,
      fromStatus,
      toStatus: status,
      amount: current?.amount,
      currency: current?.currency || 'INR',
      paymentMethod: payment_method,
      source,
      rawPayload: metadata,
      errorCode: metadata?.errorCode || null,
      errorDescription: metadata?.errorDescription || metadata?.reason || null,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    }).catch(() => {}); // never block payment update

    return result.affectedRows > 0;
  }

  async findByUserId(userId, limit = 10, offset = 0) {
    const pool = getMySQLPool();
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
    const pool = getMySQLPool();
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
    const pool = getMySQLPool();
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
