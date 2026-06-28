const { Env } = require('@phonepe-pg/pg-sdk-node');

const normalizeUrl = (url) => (url || '').replace(/\/+$/, '');

const clientVersion = Number.parseInt(process.env.PHONEPE_CLIENT_VERSION || '1', 10);
const phonePeEnv = (process.env.PHONEPE_ENV || process.env.NODE_ENV || '').toLowerCase() === 'production'
  ? Env.PRODUCTION
  : Env.SANDBOX;

const backendUrl = normalizeUrl(process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`);
const frontendUrl = normalizeUrl(process.env.FRONTEND_URL || 'http://localhost:3000');
const apiVersion = process.env.API_VERSION || 'v1';

const PHONEPE_CONFIG = {
  env: phonePeEnv,
  clientId: process.env.PHONEPE_CLIENT_ID,
  clientSecret: process.env.PHONEPE_CLIENT_SECRET,
  clientVersion: Number.isNaN(clientVersion) ? 1 : clientVersion,
  callbackUsername: process.env.PHONEPE_CALLBACK_USERNAME,
  callbackPassword: process.env.PHONEPE_CALLBACK_PASSWORD,
  redirectUrl: process.env.PHONEPE_REDIRECT_URL || `${frontendUrl}/payment/callback`,
  callbackUrl: process.env.PHONEPE_CALLBACK_URL || `${backendUrl}/api/${apiVersion}/payments/phonepe/webhook`,

  // Kept for compatibility with older diagnostics/docs in this repository.
  merchantId: process.env.PHONEPE_MERCHANT_ID || process.env.PHONEPE_CLIENT_ID,
  saltKey: process.env.PHONEPE_SALT_KEY,
  saltIndex: process.env.PHONEPE_SALT_INDEX,
  apiUrl: process.env.PHONEPE_API_URL,
  checkoutUrl: process.env.PHONEPE_CHECKOUT_URL,
  identityUrl: process.env.PHONEPE_IDENTITY_URL
};

module.exports = {
  PHONEPE_CONFIG
};
