const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const redisConnection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: false,
  tls: process.env.REDIS_TLS === 'true'
    ? { rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false' }
    : undefined,
};

const connection = new IORedis(redisConnection);
const notificationQueue = new Queue('notifications', { connection });

module.exports = { notificationQueue, connection };
