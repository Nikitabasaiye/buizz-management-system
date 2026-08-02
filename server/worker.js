const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const { connectMySQL, getMySQLPool } = require('./src/database/mysql');
const {
  initializeWorkers,
  shutdownQueues,
  getQueueHealth,
  producerConnection,
} = require('./src/queues');
const logger = require('./src/utils/logger');
const mediaService = require('./src/services/media.service');

const healthPort = Number(process.env.WORKER_HEALTH_PORT || 9090);
let ready = false;
let lastHealthError = null;

const checkDependencies = async () => {
  const pool = getMySQLPool();
  await pool.query('SELECT 1');
  if (!producerConnection) throw new Error('Redis/Valkey producer connection is disabled');
  await producerConnection.ping();
  return getQueueHealth();
};

const healthServer = http.createServer(async (req, res) => {
  if (req.url !== '/health') {
    res.writeHead(404).end();
    return;
  }

  try {
    const queues = await checkDependencies();
    lastHealthError = null;
    res.writeHead(ready ? 200 : 503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: ready ? 'ok' : 'starting',
      service: 'worker',
      timestamp: new Date().toISOString(),
      queues,
    }));
  } catch (error) {
    lastHealthError = error.message;
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'error',
      service: 'worker',
      error: lastHealthError,
      timestamp: new Date().toISOString(),
    }));
  }
});

const start = async () => {
  if (mediaService.isRequired()) {
    await mediaService.verifyConnection();
    logger.info('Required Cloudinary media storage verified for worker');
  }
  await connectMySQL();
  await initializeWorkers();
  await checkDependencies();
  ready = true;
  healthServer.listen(healthPort, '0.0.0.0', () => {
    logger.info('BullMQ worker ready', { healthPort });
  });
};

const shutdown = async (signal) => {
  ready = false;
  logger.info('Worker shutdown requested', { signal });
  healthServer.close();
  await shutdownQueues();
  const pool = getMySQLPool();
  if (pool) await pool.end();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled worker rejection', { error: error.message });
});

start().catch((error) => {
  logger.error('Worker failed to start', { error: error.message, stack: error.stack });
  process.exit(1);
});
