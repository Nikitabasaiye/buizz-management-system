const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient;

const connectRedis = async () => {
  if (process.env.REDIS_DISABLED === 'true' || process.env.DISABLE_REDIS === 'true') {
    logger.warn('Redis disabled by environment; continuing without Redis.');
    redisClient = null;
    return null;
  }

  try {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      tls: process.env.REDIS_TLS === 'true'
        ? { rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false' }
        : undefined,
    });

    redisClient.on('error', (err) => logger.error('Redis Client Error', err));
    redisClient.on('connect', () => logger.info('Redis Client Connected'));
    redisClient.on('ready', () => logger.info('Redis Client Ready'));

    redisClient.setEx = (key, seconds, value) => redisClient.setex(key, seconds, value);
    await redisClient.ping();
    
    return redisClient;
  } catch (error) {
    logger.warn(`Redis connection failed: ${error.message}. Continuing without Redis.`);
    redisClient = null;
    return null;
  }
};

const getRedisClient = () => {
  return redisClient || null;
};

module.exports = connectRedis;
module.exports.connectRedis = connectRedis;
module.exports.getRedisClient = getRedisClient;
