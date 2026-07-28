const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const temporaryTokenStore = new Map();
const blacklistedTokens = new Map();

const generateAccessToken = (id, role) =>
  jwt.sign({ id, role, type: role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '15m',
  });

const generateRefreshToken = (id, role) =>
  jwt.sign({ id, role, type: role }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
  });

const generateSecureToken = () => crypto.randomBytes(32).toString('hex');

const blacklistToken = async (token) => {
  blacklistedTokens.set(token, Date.now() + 900 * 1000);
};

const isTokenBlacklisted = async (token) => {
  const expiresAt = blacklistedTokens.get(token);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    blacklistedTokens.delete(token);
    return false;
  }
  return true;
};

const storeTemporaryToken = async (prefix, token, value, ttlSeconds = 3600) => {
  temporaryTokenStore.set(`${prefix}:${token}`, {
    value: String(value),
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

const getTemporaryToken = async (prefix, token) => {
  const key = `${prefix}:${token}`;
  const record = temporaryTokenStore.get(key);
  if (!record) return null;
  if (record.expiresAt <= Date.now()) {
    temporaryTokenStore.delete(key);
    return null;
  }
  return record.value;
};

const deleteTemporaryToken = async (prefix, token) => {
  temporaryTokenStore.delete(`${prefix}:${token}`);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateSecureToken,
  blacklistToken,
  isTokenBlacklisted,
  storeTemporaryToken,
  getTemporaryToken,
  deleteTemporaryToken,
};
