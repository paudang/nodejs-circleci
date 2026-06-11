const { env } = require('./config/env');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const healthRoutes = require('./routes/healthRoute');
const queueBoard = require('./utils/queues/queueBoard');

const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@as-integrations/express4');
const {
  ApolloServerPluginLandingPageLocalDefault,
} = require('@apollo/server/plugin/landingPage/default');
const { unwrapResolverError } = require('@apollo/server/errors');
const { ApiError } = require('./errors/ApiError');
const { typeDefs, resolvers } = require('./graphql');
const { gqlContext } = require('./graphql/context');

const setupGracefulShutdown = require('./utils/gracefulShutdown');

const app = express();
const PORT = env.PORT;
const logger = require('./utils/logger');
const morgan = require('morgan');
const { errorMiddleware } = require('./utils/errorMiddleware');

app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Background Jobs Dashboard
app.use('/admin/queues', queueBoard.getRouter());

app.use('/health', healthRoutes);

// Start Server Logic
const startServer = async () => {
  // GraphQL Setup
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginLandingPageLocalDefault({ embed: true })],
    formatError: (formattedError, error) => {
      const originalError = unwrapResolverError(error);
      if (originalError instanceof ApiError) {
        return {
          ...formattedError,
          message: originalError.message,
          extensions: {
            ...formattedError.extensions,
            code: originalError.statusCode.toString(),
          },
        };
      }

      logger.error(`GraphQL Error: ${formattedError.message}`);
      if (originalError && originalError.stack && process.env.NODE_ENV === 'development') {
        logger.error(originalError.stack);
      }
      return formattedError;
    },
  });
  await apolloServer.start();
  app.use('/graphql', expressMiddleware(apolloServer, { context: gqlContext }));
  app.use(errorMiddleware);
  const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });

  setupGracefulShutdown(server);
};

// Database Sync
const sequelize = require('./config/database');
const syncDatabase = async () => {
  let retries = 30;
  while (retries) {
    try {
      await sequelize.sync();
      logger.info('Database synced');
      // Start Server after DB is ready
      await startServer();
      break;
    } catch (err) {
      logger.error('Database sync failed:', err);
      retries -= 1;
      logger.info(`Retries left: ${retries}. Waiting 5s...`);
      await new Promise((res) => setTimeout(res, 5000));
    }
  }
};

syncDatabase();
