const {
  StandardCheckoutClient,
  StandardCheckoutPayRequest,
  RefundRequest
} = require('@phonepe-pg/pg-sdk-node');
const { PHONEPE_CONFIG } = require('../config/phonepe');
const logger = require('../utils/logger');

class PhonePeService {
  constructor() {
    this.client = null;
  }

  getClient() {
    if (!this.isConfigured()) {
      throw new Error('PhonePe V2 credentials are not configured');
    }

    // Always create a fresh client — singleton getInstance can cache stale credentials
    if (!this.client || this._clientId !== PHONEPE_CONFIG.clientId) {
      this._clientId = PHONEPE_CONFIG.clientId;
      this.client = StandardCheckoutClient.getInstance(
        PHONEPE_CONFIG.clientId,
        PHONEPE_CONFIG.clientSecret,
        PHONEPE_CONFIG.clientVersion,
        PHONEPE_CONFIG.env,
        false
      );
    }

    return this.client;
  }

  async initiatePayment(paymentData) {
    try {
      const { orderId, amount, userId, userName, userPhone, userEmail } = paymentData;
      const amountInPaise = Math.round(Number(amount) * 100);

      logger.info('Initiating PhonePe V2 payment', {
        orderId,
        amount,
        userId,
        env: PHONEPE_CONFIG.env,
        clientId: PHONEPE_CONFIG.clientId,
        clientVersion: PHONEPE_CONFIG.clientVersion,
        hasSecret: !!PHONEPE_CONFIG.clientSecret
      });

      const request = StandardCheckoutPayRequest.builder()
        .merchantOrderId(String(orderId))
        .amount(amountInPaise)
        .redirectUrl(PHONEPE_CONFIG.redirectUrl)
        .message(`Buizz booking payment for ${userName || userEmail || userPhone || `user ${userId}`}`)
        .expireAfter(900)
        .build();

      const response = await this.getClient().pay(request);

      logger.info('PhonePe V2 payment initiated', {
        orderId,
        phonePeOrderId: response.orderId,
        state: response.state
      });

      return {
        success: true,
        paymentUrl: response.redirectUrl,
        merchantTransactionId: orderId,
        phonePeOrderId: response.orderId,
        state: response.state,
        expiresAt: response.expireAt
      };
    } catch (error) {
      logger.error('PhonePe V2 initiation error', {
        error: error.message,
        responseStatus: error.response?.status || error.httpStatusCode,
        responseData: error.response?.data
      });

      const errorMessage = error.response?.data?.message || error.message || 'Payment initiation failed';
      throw new Error(errorMessage);
    }
  }

  async verifyPayment(merchantTransactionId) {
    try {
      logger.info('Verifying PhonePe V2 payment', { merchantTransactionId });

      const response = await this.getClient().getOrderStatus(String(merchantTransactionId), true);
      const latestPayment = this.getLatestPaymentDetail(response);

      logger.info('PhonePe V2 payment verified', {
        merchantTransactionId,
        phonePeOrderId: response.orderId,
        status: response.state
      });

      return this.mapOrderStatusResponse(response, latestPayment);
    } catch (error) {
      logger.error('PhonePe V2 verification error', {
        error: error.message, 
        merchantTransactionId,
        response: error.response?.data 
      });
      
      if (error.response?.status === 404) {
        return {
          success: false,
          status: 'NOT_FOUND',
          message: 'Transaction not found'
        };
      }
      
      throw error;
    }
  }

  async refundPayment(refundData) {
    try {
      const { originalMerchantOrderId, refundId, amount } = refundData;
      const amountInPaise = Math.round(Number(amount) * 100);

      const request = RefundRequest.builder()
        .merchantRefundId(String(refundId))
        .originalMerchantOrderId(String(originalMerchantOrderId))
        .amount(amountInPaise)
        .build();

      const response = await this.getClient().refund(request);

      logger.info('PhonePe V2 refund initiated', {
        originalMerchantOrderId,
        refundId: response.refundId,
        amount
      });

      return {
        success: true,
        refundId: response.refundId,
        state: response.state,
        amount: response.amount / 100
      };
    } catch (error) {
      logger.error('PhonePe V2 refund error', {
        error: error.message,
        response: error.response?.data 
      });
      throw new Error(error.response?.data?.message || error.message);
    }
  }

  parseWebhook(requestBody, authorizationHeader) {
    const responseBody = JSON.stringify(requestBody);

    if (PHONEPE_CONFIG.callbackUsername && PHONEPE_CONFIG.callbackPassword) {
      const callback = this.getClient().validateCallback(
        PHONEPE_CONFIG.callbackUsername,
        PHONEPE_CONFIG.callbackPassword,
        authorizationHeader,
        responseBody
      );

      return this.mapCallbackResponse(callback);
    }

    if (requestBody?.type && requestBody?.payload) {
      logger.warn('PhonePe webhook processed without callback username/password verification');
      return this.mapCallbackResponse(requestBody);
    }

    return this.parseLegacyWebhook(requestBody);
  }

  parseLegacyWebhook(requestBody) {
    if (!requestBody?.response) {
      throw new Error('Unsupported PhonePe webhook payload');
    }

    const decodedResponse = JSON.parse(Buffer.from(requestBody.response, 'base64').toString('utf-8'));

      return {
        merchantTransactionId: decodedResponse.merchantTransactionId,
        transactionId: decodedResponse.transactionId,
        amount: decodedResponse.amount ? decodedResponse.amount / 100 : undefined,
        state: decodedResponse.state,
        paymentMethod: 'phonepe',
        paymentInstrument: decodedResponse.paymentInstrument,
        responseCode: decodedResponse.responseCode,
        raw: decodedResponse
    };
  }

  mapCallbackResponse(callback) {
    const payload = callback.payload || {};
    const latestPayment = this.getLatestPaymentDetail(payload);

    return {
      merchantTransactionId: payload.merchantOrderId || payload.originalMerchantOrderId || payload.orderId,
      transactionId: latestPayment?.transactionId || payload.orderId || payload.refundId,
      amount: payload.amount ? payload.amount / 100 : undefined,
      state: payload.state,
      paymentMethod: 'phonepe',
      paymentInstrument: latestPayment?.instrument,
      responseCode: payload.errorCode || latestPayment?.errorCode,
      raw: callback
    };
  }

  mapOrderStatusResponse(response, latestPayment) {
    return {
      success: response.state === 'COMPLETED',
      status: response.state,
      transactionId: latestPayment?.transactionId || response.orderId,
      amount: response.amount / 100,
      paymentMethod: 'phonepe',
      responseCode: response.errorCode || latestPayment?.errorCode,
      paymentInstrument: latestPayment?.instrument,
      paymentDetails: response.paymentDetails || [],
      phonePeOrderId: response.orderId,
      merchantTransactionId: response.merchantOrderId
    };
  }

  getLatestPaymentDetail(data) {
    const details = data?.paymentDetails || [];
    if (!details.length) return null;

    return details.reduce((latest, detail) => {
      if (!latest) return detail;
      return (detail.timestamp || 0) > (latest.timestamp || 0) ? detail : latest;
    }, null);
  }

  isConfigured() {
    const configured = !!(
      PHONEPE_CONFIG.clientId &&
      PHONEPE_CONFIG.clientSecret &&
      PHONEPE_CONFIG.clientVersion
    );
    
    if (!configured) {
      logger.error('PhonePe V2 not configured properly', {
        hasClientId: !!PHONEPE_CONFIG.clientId,
        hasClientSecret: !!PHONEPE_CONFIG.clientSecret,
        hasClientVersion: !!PHONEPE_CONFIG.clientVersion
      });
    }
    
    return configured;
  }
}

module.exports = new PhonePeService();
