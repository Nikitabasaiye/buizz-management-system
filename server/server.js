const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const app = require('./src/app');
const { connectMySQL } = require('./src/database/mysql');
// const { connectRedis } = require('./src/database/redis');
const logger = require('./src/utils/logger');
const { initializeSocket } = require('./src/sockets');


const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Start Express Server
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
      // Development URL (comment out for production)
      // logger.info(`Server URL: http://localhost:${PORT}`);
      // Production URL
      logger.info(`Server URL: https://api.buizz.com`);
    });

    connectMySQL()
      .then((pool) => {
        if (pool) logger.info('MySQL startup check completed successfully');
      })
      .catch((error) => {
        logger.error('MySQL startup check failed. API is running, but DB-backed routes will fail until this is fixed:', error);
      });

    // Connect to Redis
    // await connectRedis();
    // logger.info('Redis connected successfully');

    // Initialize Socket.io
    initializeSocket(server);
    logger.info('Socket.io initialized successfully');

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`${signal} received: shutting down gracefully`);
      server.close(async () => {
        logger.info('Server shut down');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
