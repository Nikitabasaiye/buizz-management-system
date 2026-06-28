require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const logger = require('./src/utils/logger');
const { connectMySQL } = require('./src/database/mysql');
const { connectRedis } = require('./src/database/redis');

const PORT = process.env.ADMIN_PORT || 5001;

// Initialize Database Connections
const initializeConnections = async () => {
  try {
    await connectMySQL();
    logger.info('✓ MySQL connection established for Admin App');

    await connectRedis();
    logger.info('✓ Redis connection established for Admin App');
  } catch (error) {
    logger.error('✗ Failed to connect to databases:', error);
    process.exit(1);
  }
};

// Create HTTP Server
const server = http.createServer(app);

// Start Server
const startServer = async () => {
  await initializeConnections();

  server.listen(PORT, () => {
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info(`  Buizz Admin App`);
    logger.info(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`  Port: ${PORT}`);
    // Development URL (comment out for production)
    // logger.info(`  URL: http://localhost:${PORT}`);
    // logger.info(`  Health: http://localhost:${PORT}/health`);
    // logger.info(`  API: http://localhost:${PORT}/api/v1`);
    // Production URL
    logger.info(`  URL: https://admin.buizz.com`);
    logger.info(`  Health: https://admin.buizz.com/health`);
    logger.info(`  API: https://admin.buizz.com/api/v1`);
    logger.info('═══════════════════════════════════════════════════════════');
  });
};

// Graceful Shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  server.close(async () => {
    logger.info('HTTP server closed');
    // Close database connections
    try {
      const { getMySQLPool } = require('./src/database/mysql');
      const { getRedisClient } = require('./src/database/redis');
      
      const pool = getMySQLPool();
      if (pool) await pool.end();
      
      const redis = getRedisClient();
      if (redis) await redis.quit();
      
      logger.info('Database connections closed');
    } catch (err) {
      logger.error('Error closing database connections:', err);
    }
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  gracefulShutdown('UNHANDLED_REJECTION');
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

startServer().catch((error) => {
  logger.error('Failed to start admin app:', error);
  process.exit(1);
});
