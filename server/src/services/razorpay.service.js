const Razorpay = require('razorpay');
const crypto = require('crypto');
const logger = require('../utils/logger');

class RazorpayService {
  constructor() {
    this.client = null;
  }

  isConfigured() {
    return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  }

  getClient() {
    if (!this.isConfigured()) {
      throw new Error('Razorpay credentials are not configured');
    }
    if (!this.client) {
      this.client = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
    }
    return this.client;
  }

  async createOrder({ orderId, amount, currency = 'INR', notes = {} }) {
    try {
      const amountInPaise = Math.round(Number(amount) * 100);
      logger.info('Creating Razorpay order', { orderId, amount, amountInPaise });

      const order = await this.getClient().orders.create({
        amount: amountInPaise,
        currency,
        receipt: String(orderId),
        notes,
      });

      logger.info('Razorpay order created', { razorpayOrderId: order.id, orderId });

      return {
        success: true,
        razorpayOrderId: order.id,
        amount: order.amount / 100,
        currency: order.currency,
        receipt: order.receipt,
        keyId: process.env.RAZORPAY_KEY_ID,
        createdAt: order.created_at,
      };
    } catch (error) {
      logger.error('Razorpay order creation failed', { error: error.message, orderId });
      throw new Error(error.error?.description || error.message || 'Razorpay order creation failed');
    }
  }

  async verifyPayment({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
    try {
      const body = `${razorpayOrderId}|${razorpayPaymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');

      // Use timing-safe comparison to prevent timing attacks
      const expectedBuf = Buffer.from(expectedSignature, 'hex');
      const receivedBuf = Buffer.from(razorpaySignature, 'hex');
      const isValid =
        expectedBuf.length === receivedBuf.length &&
        crypto.timingSafeEqual(expectedBuf, receivedBuf);

      logger.info('Razorpay payment verification', { razorpayOrderId, razorpayPaymentId, isValid });

      if (!isValid) {
        return { success: false, status: 'FAILED', message: 'Invalid payment signature' };
      }

      const payment = await this.getClient().payments.fetch(razorpayPaymentId);

      return {
        success: true,
        status: payment.status === 'captured' ? 'COMPLETED' : payment.status.toUpperCase(),
        transactionId: razorpayPaymentId,
        razorpayOrderId,
        amount: payment.amount / 100,
        paymentMethod: payment.method,
        currency: payment.currency,
      };
    } catch (error) {
      logger.error('Razorpay payment verification failed', { error: error.message });
      throw new Error(error.message || 'Payment verification failed');
    }
  }

  // rawBody must be the raw Buffer from express.raw() middleware
  verifyWebhookSignature(rawBody, signature) {
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) return true;
    if (!signature || !rawBody) return false;
    try {
      const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(JSON.stringify(rawBody));
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(body)
        .digest('hex');

      const expectedBuf = Buffer.from(expectedSignature, 'hex');
      const receivedBuf = Buffer.from(signature, 'hex');
      if (expectedBuf.length !== receivedBuf.length) return false;
      return crypto.timingSafeEqual(expectedBuf, receivedBuf);
    } catch {
      return false;
    }
  }

  async refundPayment({ paymentId, amount }) {
    try {
      const amountInPaise = Math.round(Number(amount) * 100);
      const refund = await this.getClient().payments.refund(paymentId, { amount: amountInPaise });

      logger.info('Razorpay refund initiated', { paymentId, refundId: refund.id });

      return {
        success: true,
        refundId: refund.id,
        status: refund.status,
        amount: refund.amount / 100,
      };
    } catch (error) {
      logger.error('Razorpay refund failed', { error: error.message, paymentId });
      throw new Error(error.error?.description || error.message || 'Refund failed');
    }
  }
}

module.exports = new RazorpayService();
