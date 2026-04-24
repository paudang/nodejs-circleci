const cacheService = require('../infrastructure/caching/redisClient');
const logger = require('../infrastructure/log/logger');

class DeleteUser {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute(id) {
    const result = await this.userRepository.delete(id);

    try {
      await cacheService.del('users:all');
      await cacheService.del(`user:${id}`);
      logger.info(`Invalidated cache for user:${id} and all users`);
    } catch (error) {
      logger.error('Cache error (del):', error);
    }

    return result;
  }
}

module.exports = DeleteUser;
