const crypto = require('crypto');

const PHONEPE_CONFIG = {
  merchantId: process.env.PHONEPE_MERCHANT_ID,
  saltKey: process.env.PHONEPE_SALT_KEY,
  saltIndex: process.env.PHONEPE_SALT_INDEX || '1',
  clientId: process.env.PHONEPE_CLIENT_ID,
  clientSecret: process.env.PHONEPE_CLIENT_SECRET,
  apiUrl: process.env.PHONEPE_API_URL || 'https://api.phonepe.com/apis/pg',
  checkoutUrl: process.env.PHONEPE_CHECKOUT_URL || 'https://api.phonepe.com/apis/pg',
  identityUrl: process.env.PHONEPE_IDENTITY_URL || 'https://api.phonepe.com/apis/identity-manager',
  redirectUrl: `${process.env.FRONTEND_URL}/payment/callback`,
  callbackUrl: `${process.env.BACKEND_URL}/api/v1/payments/phonepe/webhook`,
};

const generateChecksum = (payload, endpoint) => {
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
  const string = base64Payload + endpoint + PHONEPE_CONFIG.saltKey;
  const sha256 = crypto.createHash('sha256').update(string).digest('hex');
  return sha256 + '###' + PHONEPE_CONFIG.saltIndex;
};

const verifyChecksum = (base64Response, receivedChecksum) => {
  const string = base64Response + PHONEPE_CONFIG.saltKey;
  const sha256 = crypto.createHash('sha256').update(string).digest('hex');
  const expectedChecksum = sha256 + '###' + PHONEPE_CONFIG.saltIndex;
  return expectedChecksum === receivedChecksum;
};

const generateStatusChecksum = (endpoint) => {
  const string = endpoint + PHONEPE_CONFIG.saltKey;
  const sha256 = crypto.createHash('sha256').update(string).digest('hex');
  return sha256 + '###' + PHONEPE_CONFIG.saltIndex;
};

module.exports = {
  PHONEPE_CONFIG,
  generateChecksum,
  verifyChecksum,
  generateStatusChecksum,
};
