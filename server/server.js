const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const app = require('./src/app');
const { connectMySQL } = require('./src/database/mysql');
// const { connectRedis } = require('./src/database/redis');
const logger = require('./src/utils/logger');
const { initializeSocket } = require('./src/sockets');
const mediaService = require('./src/services/media.service');


const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    if (mediaService.isRequired()) {
      await mediaService.verifyConnection();
      logger.info('Required Cloudinary media storage verified');
    }
    await connectMySQL();

    // Open the port only after production dependencies are ready.
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
      // Development URL (comment out for production)
      // logger.info(`Server URL: http://localhost:${PORT}`);
      // Production URL
      logger.info(`Server URL: https://api.buizz.com`);
    });

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
