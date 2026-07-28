const jwt = require('jsonwebtoken');
const crypto = require('crypto');
// const { getRedisClient } = require('../database/redis');
const { sendEmail } = require('./email');
const whatsappService = require('../services/whatsapp.service');
const verificationCodeService = require('../services/verification-code.service');
const { AppError } = require('../middleware/errorHandler');

const generateAccessToken = (id, role) =>
  jwt.sign({ id, role, type: role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '15m',
  });

const generateRefreshToken = (id, role) =>
  jwt.sign({ id, role, type: role }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
  });

const generateSecureToken = () => crypto.randomBytes(32).toString('hex');

const generateOtp = () => {
  return verificationCodeService.generateCode();
};

// Temporary in-memory store (Redis disabled)
const _memStore = new Map();

const blacklistToken = async (token) => {};

const isTokenBlacklisted = async (token) => false;

const storeRedisToken = async (prefix, token, value, ttlSeconds = 3600) => {
  const key = `${prefix}:${token}`;
  _memStore.set(key, String(value));
  setTimeout(() => _memStore.delete(key), ttlSeconds * 1000);
};

const getRedisToken = async (prefix, token) =>
  _memStore.get(`${prefix}:${token}`) ?? null;

const deleteRedisToken = async (prefix, token) => {
  _memStore.delete(`${prefix}:${token}`);
};

const sendEmailOtp = async (email) => {
  const { code: otp } = await verificationCodeService.create({
    channel: 'email',
    destination: email,
    purpose: 'signup',
  });
  
  // Send OTP via email
  const emailResult = await sendEmail({
    to: email,
    subject: 'Your Buizz OTP Code',
    text: `Your OTP code is: ${otp}. This code will expire in 10 minutes.`,
    html: `<p>Your OTP code is:</p>
           <h2 style="font-size:32px;letter-spacing:8px;margin:16px 0">${otp}</h2>
           <p style="color:#666;font-size:14px;">This code will expire in 10 minutes.</p>`
  });
  if (emailResult?.skipped) {
    throw new AppError(
      emailResult.error || 'Email delivery is not configured. Please contact support.',
      503,
    );
  }
  
  return { otpSent: true, emailResult };
};

const verifyEmailOtp = async (email, otp) => {
  return verificationCodeService.verify({
    channel: 'email',
    destination: email,
    purpose: 'signup',
    code: otp,
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateSecureToken,
  generateOtp,
  blacklistToken,
  isTokenBlacklisted,
  storeRedisToken,
  getRedisToken,
  deleteRedisToken,
  sendEmailOtp,
  verifyEmailOtp,
};
