const { getMySQLPool } = require('../database/mysql');

/**
 * Records every payment status change as an immutable history row.
 * Never updates — always inserts. This gives a full audit trail for
 * Razorpay, PhonePe, refunds, and manual status changes.
 */

const record = async ({
  paymentId,
  orderId,
  userId,
  eventId,
  bookingId,
  gateway,          // 'razorpay' | 'phonepe' | 'manual'
  gatewayOrderId,   // razorpay order id / phonepe merchant transaction id
  gatewayPaymentId, // razorpay payment id / phonepe transaction id
  fromStatus,
  toStatus,
  amount,
  currency = 'INR',
  paymentMethod,    // card, upi, netbanking, wallet …
  source,           // 'webhook' | 'verify_api' | 'callback' | 'refund' | 'manual'
  rawPayload,       // full gateway response object
  errorCode,
  errorDescription,
  ipAddress,
  userAgent,
}) => {
  const pool = getMySQLPool();
  const [result] = await pool.execute(
    `INSERT INTO payment_history
      (payment_id, order_id, user_id, event_id, booking_id,
       gateway, gateway_order_id, gateway_payment_id,
       from_status, to_status, amount, currency, payment_method,
       source, raw_payload, error_code, error_description,
       ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      paymentId   || null,
      orderId     || null,
      userId      || null,
      eventId     || null,
      bookingId   || null,
      gateway     || null,
      gatewayOrderId   || null,
      gatewayPaymentId || null,
      fromStatus  || null,
      toStatus    || null,
      amount      || null,
      currency,
      paymentMethod || null,
      source      || null,
      rawPayload  ? JSON.stringify(rawPayload) : null,
      errorCode   || null,
      errorDescription || null,
      ipAddress   || null,
      userAgent   || null,
    ]
  );
  return result.insertId;
};

const findByOrderId = async (orderId) => {
  const pool = getMySQLPool();
  const [rows] = await pool.execute(
    `SELECT * FROM payment_history WHERE order_id = ? ORDER BY created_at ASC`,
    [orderId]
  );
  return rows.map(formatRow);
};

const findByUserId = async (userId, { page = 1, limit = 50 } = {}) => {
  const pool = getMySQLPool();
  const offset = (page - 1) * limit;
  const [rows] = await pool.execute(
    `SELECT * FROM payment_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [userId, parseInt(limit), offset]
  );
  return rows.map(formatRow);
};

const findByGatewayPaymentId = async (gatewayPaymentId) => {
  const pool = getMySQLPool();
  const [rows] = await pool.execute(
    `SELECT * FROM payment_history WHERE gateway_payment_id = ? ORDER BY created_at ASC`,
    [gatewayPaymentId]
  );
  return rows.map(formatRow);
};

const formatRow = (row) => ({
  ...row,
  raw_payload: row.raw_payload ? JSON.parse(row.raw_payload) : null,
});

module.exports = { record, findByOrderId, findByUserId, findByGatewayPaymentId };
