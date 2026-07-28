const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const http = require('http');
const app = require('./src/app');
const logger = require('./src/utils/logger');
const { connectMySQL } = require('./src/database/mysql');

const PORT = process.env.PORT || process.env.ADMIN_PORT || 5001;

const initializeConnections = async () => {
  try {
    const pool = await connectMySQL();
    if (pool) logger.info('MySQL connection established for Admin App');
  } catch (error) {
    logger.error(
      'Admin app database startup check failed. App is running, but DB-backed routes may fail until this is fixed:',
      error
    );
  }
};

const server = http.createServer(app);

const startServer = async () => {
  server.listen(PORT, () => {
    logger.info('Buizz Admin App started');
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Port: ${PORT}`);
    logger.info('URL: https://admin.buizz.com');
    logger.info('Health: https://admin.buizz.com/health');
    logger.info('API: https://admin.buizz.com/api/v1');
  });

  initializeConnections();
};

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      const { getMySQLPool } = require('./src/database/mysql');

      const pool = getMySQLPool();
      if (pool) await pool.end();

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
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

startServer().catch((error) => {
  logger.error('Failed to start admin app:', error);
  process.exit(1);
});
