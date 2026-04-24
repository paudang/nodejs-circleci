const CreateUser = require('../../usecases/CreateUser');
const GetAllUsers = require('../../usecases/GetAllUsers');
const UpdateUser = require('../../usecases/UpdateUser');
const DeleteUser = require('../../usecases/DeleteUser');
const GetUserById = require('../../usecases/GetUserById');
const UserRepository = require('../../infrastructure/repositories/UserRepository');
const ERROR_MESSAGES = require('../../utils/errorMessages');
const HTTP_STATUS = require('../../utils/httpCodes');
const logger = require('../../infrastructure/log/logger');
const { sendMessage } = require('../../infrastructure/messaging/kafkaClient');
const { KAFKA_ACTIONS } = require('../../utils/kafkaEvents');

class UserController {
  constructor() {
    this.userRepository = new UserRepository();
    this.createUserUseCase = new CreateUser(this.userRepository);
    this.getAllUsersUseCase = new GetAllUsers(this.userRepository);
    this.updateUserUseCase = new UpdateUser(this.userRepository);
    this.deleteUserUseCase = new DeleteUser(this.userRepository);
    this.getUserByIdUseCase = new GetUserById(this.userRepository);
  }

  async getUsers(req, res, next) {
    try {
      const users = await this.getAllUsersUseCase.execute();
      res.json(users);
    } catch (error) {
      logger.error(`${ERROR_MESSAGES.FETCH_USERS_ERROR}:`, error);
      next(error);
    }
  }

  async createUser(req, res, next) {
    const { name, email, password } = req.body || {};
    try {
      if (!password) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Password is required' });
      }

      const user = await this.createUserUseCase.execute(name, email, password);
      await sendMessage(
        'user-topic',
        JSON.stringify({
          action: KAFKA_ACTIONS.USER_CREATED,
          payload: { id: user.id || user._id, email: user.email },
        }),
        (user.id || user._id).toString(),
      );
      res.status(HTTP_STATUS.CREATED).json(user);
    } catch (error) {
      logger.error(`${ERROR_MESSAGES.CREATE_USER_ERROR}:`, error);
      next(error);
    }
  }

  async updateUser(req, res, next) {
    const { id } = req.params;
    const { name, email } = req.body || {};
    try {
      const user = await this.updateUserUseCase.execute(id, { name, email });
      if (!user) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_MESSAGES.USER_NOT_FOUND });
      }
      await sendMessage(
        'user-topic',
        JSON.stringify({
          action: KAFKA_ACTIONS.USER_UPDATED,
          payload: { id, email: user.email },
        }),
        id,
      );
      res.json(user);
    } catch (error) {
      logger.error(`${ERROR_MESSAGES.UPDATE_USER_ERROR}:`, error);
      next(error);
    }
  }

  async deleteUser(req, res, next) {
    const { id } = req.params;
    try {
      const deleted = await this.deleteUserUseCase.execute(id);
      if (!deleted) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_MESSAGES.USER_NOT_FOUND });
      }
      await sendMessage(
        'user-topic',
        JSON.stringify({
          action: KAFKA_ACTIONS.USER_DELETED,
          payload: { id },
        }),
        id,
      );
      res.status(HTTP_STATUS.OK).json({ message: 'User deleted successfully' });
    } catch (error) {
      logger.error(`${ERROR_MESSAGES.DELETE_USER_ERROR}:`, error);
      next(error);
    }
  }

  async getUserById(req, res, next) {
    const { id } = req.params;
    try {
      const user = await this.getUserByIdUseCase.execute(id);
      if (!user) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_MESSAGES.USER_NOT_FOUND });
      }
      res.json(user);
    } catch (error) {
      logger.error(`${ERROR_MESSAGES.FETCH_USER_ERROR}:`, error);
      next(error);
    }
  }
}

module.exports = UserController;
