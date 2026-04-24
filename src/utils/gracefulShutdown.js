const logger = require('../infrastructure/log/logger');

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
        const mongoose = require('mongoose');
        await mongoose.connection.close(false);
        logger.info('MongoDB connection closed.');
        const redisService = require('../infrastructure/caching/redisClient');
        await redisService.quit();
        logger.info('Redis connection closed.');
        const { disconnectKafka } = require('../infrastructure/messaging/kafkaClient');
        await disconnectKafka();
        logger.info('Kafka connection closed.');
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
