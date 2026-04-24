const cacheService = require('../infrastructure/caching/redisClient');
const logger = require('../infrastructure/log/logger');

class UpdateUser {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute(id, data) {
    const updatedUser = await this.userRepository.update(id, data);

    try {
      await cacheService.del('users:all');
      await cacheService.del(`user:${id}`);
      logger.info(`Invalidated cache for user:${id} and all users`);
    } catch (error) {
      logger.error('Cache error (del):', error);
    }

    return updatedUser;
  }
}

module.exports = UpdateUser;
