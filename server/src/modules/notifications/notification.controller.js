const { notificationQueue } = require('../../jobs/queue');
const db = require('../../database/mysql');
const crypto = require('crypto');

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTP(req, res, next) {
  try {
    const { phone, email, user_id, purpose = 'login', ttl = 300 } = req.body;
    if (!phone && !email) return res.status(400).json({ success: false, message: 'phone or email required' });

    const otp = generateOTP();
    const expires_at = new Date(Date.now() + ttl * 1000);

    const insertId = await db.insertOTP({ user_id: user_id || null, phone: phone || null, email: email || null, otp, purpose, expires_at });

    // enqueue job to send OTP notifications
    await notificationQueue.add('otp', { otp, user: { phone, email }, purpose }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });

    return res.json({ success: true, message: 'OTP queued for delivery' });
  } catch (err) {
    next(err);
  }
}

async function verifyOTP(req, res, next) {
  try {
    const { phone, email, otp, purpose = 'login' } = req.body;
    if (!otp || (!phone && !email)) return res.status(400).json({ success: false, message: 'invalid request' });

    const rec = await db.getLatestOTP({ phone: phone || null, email: email || null, purpose });
    if (!rec) return res.status(404).json({ success: false, message: 'OTP not found' });

    if (rec.verified_at) return res.status(400).json({ success: false, message: 'OTP already used' });
    if (new Date(rec.expires_at) < new Date()) return res.status(400).json({ success: false, message: 'OTP expired' });

    if (rec.otp !== otp) {
      await db.query('UPDATE user_otps SET attempts = attempts + 1 WHERE id = ?', [rec.id]);
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    await db.markOTPVerified(rec.id);
    return res.json({ success: true, message: 'OTP verified' });
  } catch (err) { next(err); }
}

async function paymentWebhook(req, res, next) {
  try {
    // Expect payload with booking and user info (payment gateway must call this webhook)
    const payload = req.body;

    const booking = payload.booking;
    const user = payload.user;
    const ticket = payload.ticket || { ticket_id: payload.ticket_id || Date.now() };

    // Create job for ticket generation and notifications
    await notificationQueue.add('ticket', { booking, ticket, user }, { attempts: 5, backoff: { type: 'exponential', delay: 5000 } });

    return res.status(200).json({ success: true });
  } catch (err) { next(err); }
}

module.exports = { sendOTP, verifyOTP, paymentWebhook };
