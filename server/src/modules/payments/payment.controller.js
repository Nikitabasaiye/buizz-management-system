const phonePeService = require('../../services/phonepe.service');
const paymentRepository = require('../../repositories/payment.repository');
const settlementService = require('../settlements/settlement.service');
const bookingService = require('../bookings/booking.service');
const { getMySQLPool } = require('../../database/mysql');
const logger = require('../../utils/logger');
const { generateBigIntOrderId } = require('../../utils/orderId');

const confirmBookingForPayment = async (payment, orderId) => {
  if (!payment.booking_id) return null;

  const pool = getMySQLPool();
  await pool.execute(
    'UPDATE bookings SET booking_status = ?, payment_status = ? WHERE booking_id = ?',
    ['confirmed', 'completed', payment.booking_id]
  );

  const [existingTickets] = await pool.query(
    'SELECT COUNT(*) as count FROM tickets WHERE payment_id = ?',
    [payment.payment_id]
  );

  if (existingTickets[0]?.count > 0) {
    logger.info('Tickets already generated for payment, skipping ticket creation', {
      orderId,
      paymentId: payment.payment_id
    });
    return null;
  }

  const updatedPayment = await paymentRepository.findByOrderId(orderId);
  return bookingService.createTicketsAndEnqueueJobs(updatedPayment);
};

const failBookingForPayment = async (payment) => {
  if (!payment.booking_id) return;

  const pool = getMySQLPool();
  await pool.execute(
    'UPDATE bookings SET booking_status = ?, payment_status = ? WHERE booking_id = ?',
    ['cancelled', 'failed', payment.booking_id]
  );
};

const createPayment = async (req, res, next) => {
  try {
    const { eventId, amount, tickets } = req.body;
    const userId = req.user.id;

    // Generate BigInt order ID (18-19 digits)
    const merchantTransactionId = generateBigIntOrderId();

    // Save to database with pending status
    const payment = await paymentRepository.create({
      user_id: userId,
      event_id: eventId,
      order_id: merchantTransactionId,
      amount: amount,
      status: 'pending',
      payment_method: 'phonepe',
      metadata: { tickets }
    });

    // Initiate payment with PhonePe
    const paymentData = await phonePeService.initiatePayment({
      orderId: merchantTransactionId,
      amount,
      userId,
      userName: req.user.name,
      userPhone: req.user.phone,
      userEmail: req.user.email
    });

    res.status(200).json({
      success: true,
      message: 'Payment initiated successfully',
      data: {
        merchantTransactionId,
        paymentUrl: paymentData.paymentUrl,
        amount
      }
    });
  } catch (error) {
    logger.error('Payment creation error', { error: error.message });
    next(error);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const payment = await paymentRepository.findByOrderId(orderId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access'
      });
    }

    // Get real-time status from PhonePe
    const result = await phonePeService.verifyPayment(orderId);

    if (result.success && result.status === 'COMPLETED') {
      // Update with PhonePe's real transaction ID
      await paymentRepository.updateStatus(orderId, {
        status: 'completed',
        transaction_id: result.transactionId,
        payment_method: result.paymentMethod,
        metadata: { 
          paymentInstrument: result.paymentInstrument,
          phonePeTransactionId: result.transactionId,
          merchantTransactionId: orderId
        }
      });

      await settlementService.recordCompletedPayment(orderId).catch((error) => {
        logger.error('Failed to record settlement item', { orderId, error: error.message });
      });

      await confirmBookingForPayment(payment, orderId).catch((error) => {
        logger.error('Failed to confirm booking after payment verification', {
          orderId,
          error: error.message
        });
      });
    } else if (result.status === 'FAILED') {
      await paymentRepository.updateStatus(orderId, {
        status: 'failed',
        transaction_id: result.transactionId || null,
        payment_method: result.paymentMethod || payment.payment_method || 'phonepe',
        metadata: {
          phonePeTransactionId: result.transactionId,
          merchantTransactionId: orderId,
          verificationStatus: result.status
        }
      });

      await settlementService.reversePaymentSettlement(orderId).catch((error) => {
        logger.error('Failed to reverse settlement item', { orderId, error: error.message });
      });

      await failBookingForPayment(payment).catch((error) => {
        logger.error('Failed to mark booking failed after payment verification', {
          orderId,
          error: error.message
        });
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...result,
        merchantTransactionId: orderId,
        phonePeTransactionId: result.transactionId
      }
    });
  } catch (error) {
    logger.error('Payment verification error', { error: error.message });
    next(error);
  }
};

const handleWebhook = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization || req.headers.Authorization || req.headers['x-verify'];
    
    if (!authorization) {
      logger.warn('PhonePe webhook: Missing authorization header');
      return res.status(400).json({ success: false, message: 'Missing signature' });
    }

    const {
      merchantTransactionId,
      transactionId,
      state,
      paymentMethod,
      paymentInstrument,
      responseCode,
      raw
    } = phonePeService.parseWebhook(req.body, authorization);

    logger.info('PhonePe webhook received', { 
      merchantTransactionId, 
      phonePeTransactionId: transactionId,
      state
    });

    const payment = await paymentRepository.findByOrderId(merchantTransactionId);
    
    if (!payment) {
      logger.warn('PhonePe webhook: Payment not found', { merchantTransactionId });
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    let status = 'pending';
    if (state === 'COMPLETED') {
      status = 'completed';
    } else if (state === 'FAILED') {
      status = 'failed';
    }

    await paymentRepository.updateStatus(merchantTransactionId, {
      status,
      transaction_id: transactionId,
      payment_method: paymentMethod || paymentInstrument?.type || 'phonepe',
      metadata: { 
        paymentInstrument, 
        responseCode,
        phonePeTransactionId: transactionId,
        merchantTransactionId: merchantTransactionId,
        phonePePayload: raw,
        webhookReceived: new Date().toISOString()
      }
    });

    if (status === 'completed') {
      await settlementService.recordCompletedPayment(merchantTransactionId).catch((error) => {
        logger.error('Failed to record settlement item', {
          orderId: merchantTransactionId,
          error: error.message
        });
      });

      await confirmBookingForPayment(payment, merchantTransactionId).catch((error) => {
        logger.error('Failed to confirm booking from PhonePe webhook', {
          orderId: merchantTransactionId,
          error: error.message
        });
      });
    } else if (status === 'failed') {
      await settlementService.reversePaymentSettlement(merchantTransactionId).catch((error) => {
        logger.error('Failed to reverse settlement item', {
          orderId: merchantTransactionId,
          error: error.message
        });
      });

      await failBookingForPayment(payment).catch((error) => {
        logger.error('Failed to mark booking failed from PhonePe webhook', {
          orderId: merchantTransactionId,
          error: error.message
        });
      });
    }

    res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    logger.error('Webhook processing error', { error: error.message });
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
};

const initiateRefund = async (req, res, next) => {
  try {
    const { orderId, amount, reason } = req.body;

    const payment = await paymentRepository.findByOrderId(orderId);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Only completed payments can be refunded'
      });
    }

    const refundId = generateBigIntOrderId();
    
    const result = await phonePeService.refundPayment({
      originalMerchantOrderId: payment.order_id,
      refundId,
      amount: amount || payment.amount
    });

    await paymentRepository.updateStatus(orderId, {
      status: 'refunded',
      transaction_id: payment.transaction_id,
      payment_method: payment.payment_method,
      metadata: {
        refundId,
        refundAmount: amount || payment.amount,
        refundReason: reason || null,
        refundResponse: result,
        refundedAt: new Date().toISOString()
      }
    });

    await settlementService.reversePaymentSettlement(orderId).catch((error) => {
      logger.error('Failed to reverse settlement item after refund', { orderId, error: error.message });
    });

    res.status(200).json({
      success: true,
      message: 'Refund initiated successfully',
      data: result
    });
  } catch (error) {
    logger.error('Refund initiation error', { error: error.message });
    next(error);
  }
};

const getPaymentStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const payment = await paymentRepository.findByOrderId(orderId);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...payment,
        merchantTransactionId: payment.order_id,
        phonePeTransactionId: payment.transaction_id
      }
    });
  } catch (error) {
    logger.error('Payment status error', { error: error.message });
    next(error);
  }
};

module.exports = {
  createPayment,
  verifyPayment,
  handleWebhook,
  initiateRefund,
  getPaymentStatus
};
