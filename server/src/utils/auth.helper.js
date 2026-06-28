const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getRedisClient } = require('../database/redis');

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
  const redis = getRedisClient();
  await redis.setEx(`blacklist:${token}`, 900, 'true');
};

const isTokenBlacklisted = async (token) => {
  const redis = getRedisClient();
  return !!(await redis.get(`blacklist:${token}`));
};

const storeRedisToken = async (prefix, token, value, ttlSeconds = 3600) => {
  const redis = getRedisClient();
  await redis.setEx(`${prefix}:${token}`, ttlSeconds, String(value));
};

const getRedisToken = async (prefix, token) => {
  const redis = getRedisClient();
  return redis.get(`${prefix}:${token}`);
};

const deleteRedisToken = async (prefix, token) => {
  const redis = getRedisClient();
  await redis.del(`${prefix}:${token}`);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateSecureToken,
  blacklistToken,
  isTokenBlacklisted,
  storeRedisToken,
  getRedisToken,
  deleteRedisToken,
};
