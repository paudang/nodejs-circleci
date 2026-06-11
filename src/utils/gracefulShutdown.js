const logger = require('./logger');

const setupGracefulShutdown = (server) => {
  const gracefulShutdown = async (signal) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(async (err) => {
      if (err) {
        logger.error('Error closing HTTP server:', err);
        process.exit(1);
      }
      logger.info('HTTP server closed.');
      try {
        const sequelize = require('../config/database');
        await sequelize.close();
        logger.info('Database connection closed.');
        const redisService = require('../config/redisClient');
        await redisService.quit();
        logger.info('Redis connection closed.');
        logger.info('Graceful shutdown fully completed.');
        process.exit(0);
      } catch (err) {
        logger.error('Error during shutdown:', err);
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 15000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

module.exports = setupGracefulShutdown;
