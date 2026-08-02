const IORedis = require('ioredis');
const logger = require('../utils/logger');

const parseRedisUrl = () => {
  const url = process.env.REDIS_URL;
  if (url) return url;

  const protocol = process.env.REDIS_TLS === 'true' ? 'rediss' : 'redis';
  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = Number(process.env.REDIS_PORT || 6379);
  const password = process.env.REDIS_PASSWORD
    ? `:${encodeURIComponent(process.env.REDIS_PASSWORD)}@`
    : '';
  return `${protocol}://${password}${host}:${port}`;
};

const createRedisConnection = (connectionName = 'bullmq') => {
  if (process.env.REDIS_DISABLED === 'true' || process.env.DISABLE_REDIS === 'true') {
    throw new Error('BullMQ requires Redis/Valkey, but Redis is disabled');
  }

  const connection = new IORedis(parseRedisUrl(), {
    connectionName: `buizz-${connectionName}`,
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: false,
    keepAlive: 10000,
    connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 10000),
    tls: parseRedisUrl().startsWith('rediss://')
      ? { rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false' }
      : undefined,
  });

  connection.on('error', (error) => {
    logger.error('Redis/Valkey connection error', {
      connectionName,
      error: error.message,
    });
  });
  connection.on('ready', () => {
    logger.info('Redis/Valkey connection ready', { connectionName });
  });

  return connection;
};

module.exports = { createRedisConnection, parseRedisUrl };
