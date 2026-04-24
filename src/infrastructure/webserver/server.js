const express = require('express');
const cors = require('cors');
const logger = require('../log/logger');
const morgan = require('morgan');
const { errorMiddleware } = require('./middleware/errorMiddleware');
const healthRoutes = require('../../interfaces/routes/healthRoute');
const setupGracefulShutdown = require('../../utils/gracefulShutdown');
const apiRoutes = require('../../interfaces/routes/api');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./swagger');
const authRoutes = require('../../interfaces/routes/authRoutes');

const { env } = require('../config/env');

const startServer = async () => {
  // Determine port using the validated env
  const port = env.PORT;
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
  app.use('/api', apiRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
  app.use('/health', healthRoutes);

  app.use(errorMiddleware);

  const server = app.listen(port, () => {
    logger.info(`Server running on port ${port}`);
    const { connectKafka } = require('../../infrastructure/messaging/kafkaClient');
    connectKafka()
      .then(async () => {
        logger.info('Kafka connected');
      })
      .catch((err) => {
        logger.error('Failed to connect to Kafka after retries:', err.message);
      });
  });

  setupGracefulShutdown(server);
};

module.exports = startServer;
