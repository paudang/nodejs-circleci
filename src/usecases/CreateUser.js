const User = require('../domain/models/User');
const bcrypt = require('bcryptjs');
const cacheService = require('../infrastructure/caching/redisClient');
const logger = require('../infrastructure/log/logger');

class CreateUser {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute(name, email, password) {
    let finalPassword = password;
    if (password) {
      finalPassword = await bcrypt.hash(password, 10);
    }
    const user = new User(null, name, email, finalPassword);
    const savedUser = await this.userRepository.save(user);

    try {
      await cacheService.del('users:all');
      logger.info('Invalidated users:all cache');
    } catch (error) {
      logger.error('Cache error (del):', error);
    }

    return savedUser;
  }
}

module.exports = CreateUser;
