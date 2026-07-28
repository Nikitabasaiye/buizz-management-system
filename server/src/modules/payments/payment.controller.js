const phonePeService = require('../../services/phonepe.service');
const razorpayService = require('../../services/razorpay.service');
const paymentRepository = require('../../repositories/payment.repository');
const settlementService = require('../settlements/settlement.service');
const bookingService = require('../bookings/booking.service');
const auditService = require('../../services/audit.service');
const { getMySQLPool } = require('../../database/mysql');
const { generateBigIntOrderId } = require('../../utils/orderId');
const logger = require('../../utils/logger');

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
    logger.info('Tickets already generated for payment, skipping', { orderId, paymentId: payment.payment_id });
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
    const { eventId, amount, tickets, paymentMethod = 'phonepe' } = req.body;
    const userId = req.user.id;
    const merchantTransactionId = generateBigIntOrderId();

    let paymentData;
    let razorpayOrderId = null;
    let razorpayCreatedAt = null;

    if (paymentMethod === 'razorpay') {
      // Razorpay payment flow
      const razorpayOrder = await razorpayService.createOrder({
        orderId: merchantTransactionId,
        amount,
        currency: 'INR',
        notes: { eventId, userId, tickets },
      });

      razorpayOrderId = razorpayOrder.razorpayOrderId;
      razorpayCreatedAt = razorpayOrder.createdAt;

      paymentData = {
        keyId: razorpayOrder.keyId,
        razorpayOrderId: razorpayOrder.razorpayOrderId,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      };
    } else {
      // PhonePe payment flow (default)
      paymentData = await phonePeService.initiatePayment({
        orderId: merchantTransactionId,
        amount,
        userId,
        userName: req.user.name,
        userPhone: req.user.phone,
        userEmail: req.user.email,
      });
    }

    await paymentRepository.create({
      user_id: userId,
      event_id: eventId,
      order_id: merchantTransactionId,
      amount,
      status: 'pending',
      payment_method: paymentMethod,
      razorpay_order_id: razorpayOrderId,
      razorpay_created_at: razorpayCreatedAt ? new Date(razorpayCreatedAt * 1000) : null,
      metadata: { tickets },
    });

    const actionName = paymentMethod === 'razorpay' ? 'razorpay_payment_initiated' : 'phonepe_payment_initiated';

    await auditService.logAction({
      userId,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: actionName,
      actionType: 'payment',
      resourceType: 'payment',
      description: `${paymentMethod === 'razorpay' ? 'Razorpay' : 'PhonePe'} payment initiated for event ${eventId}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata: { orderId: merchantTransactionId, amount, eventId, paymentMethod, razorpayOrderId },
      severity: 'low',
    }).catch(() => {});

    const responseData = paymentMethod === 'razorpay'
      ? { merchantTransactionId, ...paymentData, amount }
      : { merchantTransactionId, paymentUrl: paymentData.paymentUrl, amount };

    res.status(200).json({
      success: true,
      message: 'Payment initiated successfully',
      data: responseData,
    });
  } catch (error) {
    logger.error('Payment creation error', { error: error.message });
    next(error);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { razorpayPaymentId, razorpaySignature } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');

    const payment = await paymentRepository.findByOrderId(orderId);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    if (String(payment.user_id) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }

    let result;
    let paymentGateway = payment.payment_method || 'phonepe';

    if (paymentGateway === 'razorpay') {
      // Razorpay verification
      if (!razorpayPaymentId || !razorpaySignature) {
        return res.status(400).json({ success: false, message: 'Razorpay payment ID and signature are required' });
      }

      result = await razorpayService.verifyPayment({
        razorpayOrderId: payment.razorpay_order_id,
        razorpayPaymentId,
        razorpaySignature,
      });
    } else {
      // PhonePe verification (default)
      result = await phonePeService.verifyPayment(orderId);
    }

    let bookingConfirmation = null;

    if (result.success && result.status === 'COMPLETED') {
      const updateData = {
        status: 'completed',
        transaction_id: result.transactionId,
        payment_method: result.paymentMethod || paymentGateway,
      };

      // Add Razorpay-specific fields if applicable
      if (paymentGateway === 'razorpay') {
        updateData.razorpay_payment_id = razorpayPaymentId;
        updateData.razorpay_signature = razorpaySignature;
        updateData.metadata = {
          razorpayOrderId: payment.razorpay_order_id,
          razorpayPaymentId,
          merchantTransactionId: orderId,
        };
      } else {
        updateData.metadata = {
          paymentInstrument: result.paymentInstrument,
          phonePeTransactionId: result.transactionId,
          merchantTransactionId: orderId,
        };
      }

      await paymentRepository.updateStatus(orderId, updateData, { source: 'verify_api', ipAddress, userAgent });

      await settlementService.recordCompletedPayment(orderId).catch((error) => {
        logger.error('Failed to record settlement item', { orderId, error: error.message });
      });

      await confirmBookingForPayment(payment, orderId).catch((error) => {
        logger.error('Failed to confirm booking after payment verification', { orderId, error: error.message });
      });

      const updatedPayment = await paymentRepository.findByOrderId(orderId);
      bookingConfirmation = await bookingService
        .createTicketsAndEnqueueJobs(updatedPayment)
        .catch((error) => {
          logger.error('Ticket creation/email failed after payment verification', {
            orderId,
            error: error.message,
            stack: error.stack,
          });
          return {
            tickets: [],
            emailDelivery: {
              attempted: false,
              sent: false,
              skipped: true,
              reason: 'TICKET_CREATION_FAILED',
              error: error.message,
            },
          };
        });

      const actionName = paymentGateway === 'razorpay' ? 'razorpay_payment_verified' : 'phonepe_payment_verified';
      await auditService.logAction({
        userId: req.user.id,
        action: actionName,
        actionType: 'payment',
        resourceType: 'payment',
        resourceId: payment.payment_id,
        description: `${paymentGateway === 'razorpay' ? 'Razorpay' : 'PhonePe'} payment verified: ${result.transactionId}`,
        ipAddress,
        metadata: { orderId, transactionId: result.transactionId, paymentGateway },
        severity: 'low',
      }).catch(() => {});

    } else if (result.status === 'FAILED') {
      const updateData = {
        status: 'failed',
        transaction_id: result.transactionId || null,
        payment_method: result.paymentMethod || paymentGateway,
      };

      if (paymentGateway === 'razorpay') {
        updateData.razorpay_payment_id = razorpayPaymentId;
        updateData.metadata = {
          razorpayOrderId: payment.razorpay_order_id,
          razorpayPaymentId,
          merchantTransactionId: orderId,
          verificationStatus: result.status,
        };
      } else {
        updateData.metadata = {
          phonePeTransactionId: result.transactionId,
          merchantTransactionId: orderId,
          verificationStatus: result.status,
        };
      }

      await paymentRepository.updateStatus(orderId, updateData, { source: 'verify_api', ipAddress, userAgent });

      await settlementService.reversePaymentSettlement(orderId).catch((error) => {
        logger.error('Failed to reverse settlement item', { orderId, error: error.message });
      });

      await failBookingForPayment(payment).catch((error) => {
        logger.error('Failed to mark booking failed', { orderId, error: error.message });
      });

      const actionName = paymentGateway === 'razorpay' ? 'razorpay_payment_failed' : 'phonepe_payment_failed';
      await auditService.logAction({
        userId: req.user.id,
        action: actionName,
        actionType: 'payment',
        resourceType: 'payment',
        resourceId: payment.payment_id,
        description: `${paymentGateway === 'razorpay' ? 'Razorpay' : 'PhonePe'} payment failed for order ${orderId}`,
        ipAddress,
        metadata: { orderId, paymentGateway },
        severity: 'medium',
      }).catch(() => {});
    }

    const responseData = paymentGateway === 'razorpay'
      ? { ...result, merchantTransactionId: orderId, razorpayPaymentId, razorpayOrderId: payment.razorpay_order_id, bookingConfirmation }
      : { ...result, merchantTransactionId: orderId, phonePeTransactionId: result.transactionId, bookingConfirmation };

    res.status(200).json({
      success: true,
      data: responseData,
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
      raw,
    } = phonePeService.parseWebhook(req.body, authorization);

    logger.info('PhonePe webhook received', { merchantTransactionId, phonePeTransactionId: transactionId, state });

    const payment = await paymentRepository.findByOrderId(merchantTransactionId);
    if (!payment) {
      logger.warn('PhonePe webhook: Payment not found', { merchantTransactionId });
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    let status = 'pending';
    if (state === 'COMPLETED') status = 'completed';
    else if (state === 'FAILED') status = 'failed';

    await paymentRepository.updateStatus(
      merchantTransactionId,
      {
        status,
        transaction_id: transactionId,
        payment_method: paymentMethod || paymentInstrument?.type || 'phonepe',
        metadata: {
          paymentInstrument,
          responseCode,
          phonePeTransactionId: transactionId,
          merchantTransactionId,
          phonePePayload: raw,
          webhookReceived: new Date().toISOString(),
        },
      },
      { source: 'webhook' }
    );

    if (status === 'completed') {
      await settlementService.recordCompletedPayment(merchantTransactionId).catch((error) => {
        logger.error('Failed to record settlement item', { orderId: merchantTransactionId, error: error.message });
      });

      await confirmBookingForPayment(payment, merchantTransactionId).catch((error) => {
        logger.error('Failed to confirm booking from PhonePe webhook', { orderId: merchantTransactionId, error: error.message });
      });

      await auditService.logAction({
        userId: payment.user_id,
        action: 'phonepe_webhook_payment_completed',
        actionType: 'payment',
        resourceType: 'payment',
        resourceId: payment.payment_id,
        description: `PhonePe payment completed via webhook: ${transactionId}`,
        metadata: { merchantTransactionId, transactionId, responseCode },
        severity: 'low',
      }).catch(() => {});

    } else if (status === 'failed') {
      await settlementService.reversePaymentSettlement(merchantTransactionId).catch((error) => {
        logger.error('Failed to reverse settlement item', { orderId: merchantTransactionId, error: error.message });
      });

      await failBookingForPayment(payment).catch((error) => {
        logger.error('Failed to mark booking failed from PhonePe webhook', { orderId: merchantTransactionId, error: error.message });
      });

      await auditService.logAction({
        userId: payment.user_id,
        action: 'phonepe_webhook_payment_failed',
        actionType: 'payment',
        resourceType: 'payment',
        resourceId: payment.payment_id,
        description: `PhonePe payment failed via webhook`,
        metadata: { merchantTransactionId, responseCode },
        severity: 'medium',
      }).catch(() => {});
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
    const ipAddress = req.ip;

    const payment = await paymentRepository.findByOrderId(orderId);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    if (payment.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Only completed payments can be refunded' });
    }

    const refundId = generateBigIntOrderId();
    const result = await phonePeService.refundPayment({
      originalMerchantOrderId: payment.order_id,
      refundId,
      amount: amount || payment.amount,
    });

    await paymentRepository.updateStatus(
      orderId,
      {
        status: 'refunded',
        transaction_id: payment.transaction_id,
        payment_method: payment.payment_method,
        metadata: {
          refundId,
          refundAmount: amount || payment.amount,
          refundReason: reason || null,
          refundResponse: result,
          refundedAt: new Date().toISOString(),
        },
      },
      { source: 'refund', ipAddress }
    );

    await settlementService.reversePaymentSettlement(orderId).catch((error) => {
      logger.error('Failed to reverse settlement item after refund', { orderId, error: error.message });
    });

    await auditService.logAction({
      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'payment_refund_initiated',
      actionType: 'refund',
      resourceType: 'payment',
      resourceId: payment.payment_id,
      description: `Refund initiated for order ${orderId}, amount: ${amount || payment.amount}`,
      ipAddress,
      metadata: { orderId, refundId, amount: amount || payment.amount, reason },
      severity: 'medium',
    }).catch(() => {});

    res.status(200).json({ success: true, message: 'Refund initiated successfully', data: result });
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
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        ...payment,
        merchantTransactionId: payment.order_id,
        phonePeTransactionId: payment.transaction_id,
      },
    });
  } catch (error) {
    logger.error('Payment status error', { error: error.message });
    next(error);
  }
};

const getAllPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const pool = getMySQLPool();
    const offset = (page - 1) * limit;

    // Get payments with user and event details
    const [payments] = await pool.query(
      `SELECT 
         p.payment_id,
         p.order_id,
         p.amount,
         p.status,
         p.payment_method,
         p.transaction_id,
         p.created_at,
         u.user_id,
         u.name as user_name,
         u.email as user_email,
         e.event_id,
         e.title as event_title
       FROM payments p
       JOIN users u ON p.user_id = u.user_id
       JOIN events e ON p.event_id = e.event_id
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [parseInt(limit), offset]
    );

    // Get total count
    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) as total FROM payments'
    );

    res.status(200).json({
      success: true,
      data: payments.map(p => ({
        payment_id: p.payment_id,
        order_id: p.order_id,
        transaction_id: p.transaction_id,
        user_name: p.user_name,
        event_title: p.event_title,
        amount: p.amount,
        payment_method: p.payment_method,
        status: p.status,
        created_at: p.created_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get all payments error', { error: error.message });
    next(error);
  }
};

const diagPhonePe = (req, res) => {
  const { PHONEPE_CONFIG } = require('../../config/phonepe');
  res.json({
    clientId: PHONEPE_CONFIG.clientId || '(empty)',
    clientIdLength: (PHONEPE_CONFIG.clientId || '').length,
    hasSecret: !!PHONEPE_CONFIG.clientSecret,
    secretLength: (PHONEPE_CONFIG.clientSecret || '').length,
    clientVersion: PHONEPE_CONFIG.clientVersion,
    env: String(PHONEPE_CONFIG.env),
    isConfigured: !!(PHONEPE_CONFIG.clientId && PHONEPE_CONFIG.clientSecret && PHONEPE_CONFIG.clientVersion),
  });
};

module.exports = {
  createPayment,
  verifyPayment,
  handleWebhook,
  initiateRefund,
  getPaymentStatus,
  getAllPayments,
  diagPhonePe,
};
