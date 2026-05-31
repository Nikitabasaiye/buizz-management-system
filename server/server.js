const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env'), override: true });
const app = require('./src/app');
const { connectMySQL } = require('./src/database/mysql');
const connectRedis = require('./src/database/redis');
const logger = require('./src/utils/logger');
const { initializeQueues } = require('./src/queues');
const { initializeSocket } = require('./src/sockets');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MySQL
    await connectMySQL();

    // Connect to Redis
    await connectRedis();
    logger.info('Redis connected successfully');

    // Initialize BullMQ Queues
    await initializeQueues();
    logger.info('Queues initialized successfully');

    // Start Express Server
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });

    // Initialize Socket.io
    initializeSocket(server);
    logger.info('Socket.io initialized successfully');

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
