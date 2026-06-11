const User = require('../models/User');
const ERROR_MESSAGES = require('../utils/errorMessages');
const logger = require('../utils/logger');
const cacheService = require('../config/redisClient');

const getUsers = async () => {
  try {
    const users = await cacheService.getOrSet(
      'users:all',
      async () => {
        return await User.findAll();
      },
      60,
    );
    return users;
  } catch (error) {
    logger.error(`${ERROR_MESSAGES.FETCH_USERS_ERROR}:`, error);
    throw error;
  }
};

const createUser = async (data) => {
  try {
    const { name, email } = data;

    const user = await User.create({ name, email });

    await cacheService.del('users:all');
    const userObj = user.toJSON ? user.toJSON() : { ...user };
    delete userObj.password;
    return userObj;
  } catch (error) {
    logger.error(`${ERROR_MESSAGES.CREATE_USER_ERROR}:`, error);
    throw error;
  }
};

const updateUser = async (id, data) => {
  try {
    const user = await User.findByPk(id);
    if (!user) throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
    await user.update(data);
    const updatedUser = user;
    await cacheService.del('users:all');
    return updatedUser;
  } catch (error) {
    logger.error(`${ERROR_MESSAGES.UPDATE_USER_ERROR}:`, error);
    throw error;
  }
};

const deleteUser = async (id) => {
  try {
    const user = await User.findByPk(id);
    if (!user) throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
    await user.destroy();
    await cacheService.del('users:all');
    return true;
  } catch (error) {
    logger.error(`${ERROR_MESSAGES.DELETE_USER_ERROR}:`, error);
    throw error;
  }
};

module.exports = { getUsers, createUser, updateUser, deleteUser };
