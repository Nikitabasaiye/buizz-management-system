const axios = require('axios');
const { PHONEPE_CONFIG, generateChecksum, verifyChecksum, generateStatusChecksum } = require('../config/phonepe');
const logger = require('../utils/logger');

class PhonePeService {
  constructor() {
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async initiatePayment(paymentData) {
    try {
      const { orderId, amount, userId, userName, userPhone, userEmail } = paymentData;

      logger.info('Initiating PhonePe payment', { orderId, amount, userId });

      const payload = {
        merchantId: PHONEPE_CONFIG.merchantId,
        merchantTransactionId: orderId,
        merchantUserId: `USER_${userId}`,
        amount: Math.round(amount * 100),
        redirectUrl: PHONEPE_CONFIG.redirectUrl,
        redirectMode: 'REDIRECT',
        callbackUrl: PHONEPE_CONFIG.callbackUrl,
        mobileNumber: userPhone?.replace(/\D/g, ''),
        paymentInstrument: {
          type: 'PAY_PAGE'
        }
      };

      // Standard Checkout v1 endpoint (most widely supported)
      const endpoint = '/pg/v1/pay';
      const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const checksum = generateChecksum(payload, endpoint);

      const fullUrl = `${PHONEPE_CONFIG.apiUrl}${endpoint}`;

      logger.info('PhonePe API request details', { 
        url: fullUrl,
        merchantId: PHONEPE_CONFIG.merchantId,
        orderId,
        endpoint,
        saltIndex: PHONEPE_CONFIG.saltIndex,
        checksumPreview: checksum.substring(0, 20) + '...'
      });

      const response = await this.axiosInstance.post(
        fullUrl,
        { request: base64Payload },
        { 
          headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': checksum,
            'accept': 'application/json'
          }
        }
      );

      logger.info('PhonePe API response', { 
        success: response.data.success,
        code: response.data.code,
        message: response.data.message
      });

      if (response.data.success) {
        return {
          success: true,
          paymentUrl: response.data.data.instrumentResponse.redirectInfo.url,
          merchantTransactionId: orderId
        };
      } else {
        throw new Error(response.data.message || 'Payment initiation failed');
      }
    } catch (error) {
      logger.error('PhonePe initiation error FULL DETAILS', { 
        error: error.message,
        code: error.code,
        responseStatus: error.response?.status,
        responseData: error.response?.data,
        requestUrl: error.config?.url
      });

      const errorMessage = error.response?.data?.message || error.message;
      throw new Error(errorMessage);
    }
  }

  async verifyPayment(merchantTransactionId) {
    try {
      const endpoint = `/pg/v1/status/${PHONEPE_CONFIG.merchantId}/${merchantTransactionId}`;
      const checksum = generateStatusChecksum(endpoint);

      logger.info('Verifying payment', { merchantTransactionId });

      const response = await this.axiosInstance.get(
        `${PHONEPE_CONFIG.apiUrl}${endpoint}`,
        { 
          headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': checksum,
            'X-MERCHANT-ID': PHONEPE_CONFIG.merchantId
          }
        }
      );

      if (response.data.success) {
        const paymentData = response.data.data;
        logger.info('PhonePe payment verified', { 
          merchantTransactionId, 
          status: paymentData.state 
        });
        
        return {
          success: true,
          status: paymentData.state,
          transactionId: paymentData.transactionId,
          amount: paymentData.amount / 100,
          paymentMethod: paymentData.paymentInstrument?.type,
          responseCode: paymentData.responseCode,
          paymentInstrument: paymentData.paymentInstrument
        };
      } else {
        return {
          success: false,
          status: 'FAILED',
          message: response.data.message
        };
      }
    } catch (error) {
      logger.error('PhonePe verification error', { 
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
      const { originalTransactionId, refundId, amount } = refundData;

      const payload = {
        merchantId: PHONEPE_CONFIG.merchantId,
        merchantTransactionId: refundId,
        originalTransactionId: originalTransactionId,
        amount: Math.round(amount * 100),
        callbackUrl: PHONEPE_CONFIG.callbackUrl
      };

      const endpoint = '/pg/v1/refund';
      const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const checksum = generateChecksum(payload, endpoint);

      const response = await this.axiosInstance.post(
        `${PHONEPE_CONFIG.apiUrl}${endpoint}`,
        { request: base64Payload },
        { 
          headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': checksum
          }
        }
      );

      if (response.data.success) {
        logger.info('PhonePe refund initiated', { originalTransactionId, amount });
        return {
          success: true,
          refundId: response.data.data.merchantTransactionId,
          state: response.data.data.state
        };
      } else {
        throw new Error(response.data.message || 'Refund initiation failed');
      }
    } catch (error) {
      logger.error('PhonePe refund error', { 
        error: error.message,
        response: error.response?.data 
      });
      throw new Error(error.response?.data?.message || error.message);
    }
  }

  verifyWebhookSignature(requestBody, receivedChecksum) {
    try {
      const base64Response = Buffer.from(JSON.stringify(requestBody)).toString('base64');
      return verifyChecksum(base64Response, receivedChecksum);
    } catch (error) {
      logger.error('Webhook signature verification failed', { error: error.message });
      return false;
    }
  }

  isConfigured() {
    const configured = !!(
      PHONEPE_CONFIG.merchantId &&
      PHONEPE_CONFIG.saltKey &&
      PHONEPE_CONFIG.apiUrl
    );
    
    if (!configured) {
      logger.error('PhonePe not configured properly', {
        hasMerchantId: !!PHONEPE_CONFIG.merchantId,
        hasSaltKey: !!PHONEPE_CONFIG.saltKey,
        hasApiUrl: !!PHONEPE_CONFIG.apiUrl
      });
    }
    
    return configured;
  }
}

module.exports = new PhonePeService();
