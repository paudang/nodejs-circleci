const startServer = require('./infrastructure/webserver/server');
const logger = require('./infrastructure/log/logger');
const { connectKafka } = require('./infrastructure/messaging/kafkaClient');
// Database Sync
const connectDB = require('./infrastructure/database/database');

const syncDatabase = async () => {
  let retries = 30;
  while (retries) {
    try {
      await connectDB();
      logger.info('Database synced');
      // Start the web server after DB sync
      startServer();
      // Connect Kafka
      connectKafka()
        .then(async () => {
          logger.info('Kafka connected');
        })
        .catch((err) => {
          logger.error('Failed to connect to Kafka:', err);
        });
      break;
    } catch (error) {
      logger.error('Error syncing database:', error);
      retries -= 1;
      logger.info(`Retries left: ${retries}`);
      await new Promise((res) => setTimeout(res, 5000));
    }
  }
};
syncDatabase();
