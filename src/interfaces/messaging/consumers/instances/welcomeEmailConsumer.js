const BaseConsumer = require('../../baseConsumer');
const logger = require('../../../../infrastructure/log/logger');
const { UserEventSchema } = require('../../schemas/userEventSchema');
const ERROR_MESSAGES = require('../../../../utils/errorMessages');
const { KAFKA_ACTIONS } = require('../../../../utils/kafkaEvents');

class WelcomeEmailConsumer extends BaseConsumer {
  constructor() {
    super();
  }

  get topic() {
    return 'user-topic';
  }
  get groupId() {
    return 'welcome-email-group';
  }

  async handle(data) {
    const result = UserEventSchema.safeParse(data);

    if (!result.success) {
      logger.error(`[Kafka] ${ERROR_MESSAGES.INVALID_USER_DATA}:`, result.error.format());
      return;
    }

    const { action, payload } = result.data;

    switch (action) {
      case KAFKA_ACTIONS.USER_CREATED:
        logger.info(`[Kafka] Consumer: Received ${KAFKA_ACTIONS.USER_CREATED}.`);
        logger.info(`[Kafka] Consumer: 📧 Sending welcome email to '${payload.email}'... Done!`);
        break;
      case KAFKA_ACTIONS.USER_UPDATED:
        logger.info(`[Kafka] Consumer: Received ${KAFKA_ACTIONS.USER_UPDATED}.`);
        logger.info(
          `[Kafka] Consumer: 🔄 Updating user records for '${payload.id}' (Email: ${payload.email})... Done!`,
        );
        break;
      case KAFKA_ACTIONS.USER_DELETED:
        logger.info(`[Kafka] Consumer: Received ${KAFKA_ACTIONS.USER_DELETED}.`);
        logger.info(`[Kafka] Consumer: 🗑️ Cleaning up data for user '${payload.id}'... Done!`);
        break;
      default:
        logger.warn(`[Kafka] Unknown action: ${action}`);
    }
  }
}

module.exports = WelcomeEmailConsumer;
