const express = require('express');
const crypto = require('crypto');
const logger = require('../../utils/logger');

const router = express.Router();

const base64UrlDecode = (value = '') => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
};

const base64UrlEncode = (buffer) => buffer
  .toString('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '');

const parseSignedRequest = (signedRequest) => {
  if (!signedRequest || typeof signedRequest !== 'string' || !signedRequest.includes('.')) {
    return null;
  }

  const [encodedSignature, encodedPayload] = signedRequest.split('.', 2);
  const appSecret = process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET || process.env.FB_APP_SECRET;

  if (appSecret) {
    const expectedSignature = base64UrlEncode(
      crypto.createHmac('sha256', appSecret).update(encodedPayload).digest()
    );

    if (encodedSignature !== expectedSignature) {
      const error = new Error('Invalid Meta signed_request signature');
      error.statusCode = 400;
      error.status = 'fail';
      error.isOperational = true;
      throw error;
    }
  }

  try {
    return JSON.parse(base64UrlDecode(encodedPayload));
  } catch (parseError) {
    const error = new Error('Invalid Meta signed_request payload');
    error.statusCode = 400;
    error.status = 'fail';
    error.isOperational = true;
    throw error;
  }
};

const buildStatusUrl = (confirmationCode) => {
  const publicBaseUrl = (
    process.env.PUBLIC_API_URL ||
    process.env.API_PUBLIC_URL ||
    process.env.API_BASE_URL ||
    'https://api.buizz.com'
  )
    .replace(/\/api\/v\d+\/?$/, '')
    .replace(/\/$/, '');

  return `${publicBaseUrl}/meta/data-deletion/status/${encodeURIComponent(confirmationCode)}`;
};

router.get('/facebook-config', (req, res) => {
  const appId =
    process.env.FACEBOOK_APP_ID ||
    process.env.META_APP_ID ||
    process.env.FB_APP_ID;
  if (!appId) {
    return res.status(200).json({
      success: true,
      data: {
        configured: false,
        appId: null,
        apiVersion: process.env.FACEBOOK_API_VERSION || process.env.META_API_VERSION || 'v25.0',
        loginConfigId: null,
      },
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      configured: true,
      appId,
      apiVersion: process.env.FACEBOOK_API_VERSION || process.env.META_API_VERSION || 'v25.0',
      loginConfigId:
        process.env.FACEBOOK_LOGIN_CONFIG_ID ||
        process.env.META_LOGIN_CONFIG_ID ||
        null,
    },
  });
});

router.get('/data-deletion', (req, res) => {
  return res.status(200).json({
    status: 'success',
    message: 'Meta data deletion endpoint is active',
    method: 'POST',
  });
});

router.get('/data-deletion/status/:confirmationCode', (req, res) => {
  return res.status(200).json({
    status: 'pending',
    confirmation_code: req.params.confirmationCode,
    message: 'Your data deletion request has been received and is being processed.',
  });
});

router.post('/data-deletion', (req, res, next) => {
  try {
    const signedRequest = req.body?.signed_request || req.query?.signed_request;
    const payload = signedRequest ? parseSignedRequest(signedRequest) : null;
    const metaUserId = payload?.user_id || payload?.user?.id || null;
    const confirmationCode = `META-DEL-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    logger.info('Meta data deletion request received', {
      confirmationCode,
      metaUserId: metaUserId || 'unknown',
    });

    return res.status(200).json({
      url: buildStatusUrl(confirmationCode),
      confirmation_code: confirmationCode,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
