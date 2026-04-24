const cacheService = require('../infrastructure/caching/redisClient');
const logger = require('../infrastructure/log/logger');

class GetUserById {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute(id) {
    const cacheKey = `user:${id}`;
    try {
      const cachedUser = await cacheService.get(cacheKey);
      if (cachedUser) {
        logger.info(`Serving user ${id} from cache`);
        return cachedUser;
      }
    } catch (error) {
      logger.error('Cache error (get):', error);
    }

    const user = await this.userRepository.findById(id);

    if (user) {
      try {
        await cacheService.set(cacheKey, user, 3600); // Cache for 1 hour
      } catch (error) {
        logger.error('Cache error (set):', error);
      }
    }

    return user;
  }
}

module.exports = GetUserById;
