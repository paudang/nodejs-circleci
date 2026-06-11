const ERROR_MESSAGES = require('@/utils/errorMessages');
const { getUsers, createUser, updateUser, deleteUser } = require('@/controllers/userController');
const cacheService = require('@/config/redisClient');

// Mock dependencies
jest.mock('@/models/User', () => {
  return {
    create: jest.fn(),
    find: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    mockData: [],
  };
});
const User = require('@/models/User');
jest.mock('@/config/redisClient', () => ({
  getOrSet: jest.fn((_key, fetcher) => fetcher()),
  del: jest.fn(),
  flush: jest.fn(),
}));
jest.mock('@/utils/logger');

describe('UserController', () => {
  beforeEach(() => {
    cacheService.getOrSet.mockImplementation((_key, fetcher) => fetcher());
    cacheService.flush.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    it('should return successfully (Happy Path)', async () => {
      // Arrange
      const usersMock = [{ id: '1', name: 'Test', email: 'test@example.com' }];
      User.findAll.mockResolvedValue(usersMock);

      // Act
      const result = await getUsers();

      // Assert
      expect(result).toEqual(usersMock);
    });

    it('should return an empty array when no users found', async () => {
      // Arrange
      const usersMock = [];
      User.findAll.mockResolvedValue(usersMock);

      // Act
      const result = await getUsers();

      // Assert
      expect(result).toEqual(usersMock);
    });

    it('should handle errors correctly (Error Handling)', async () => {
      // Arrange
      const error = new Error('Database Error');
      // Simulating error inside the fetcher by making User.findAll fail
      User.findAll.mockRejectedValue(error);

      // Act & Assert
      await expect(getUsers()).rejects.toThrow(error);
    });
  });

  describe('createUser', () => {
    it('should successfully create a new user (Happy Path)', async () => {
      // Arrange
      const payload = { name: 'Alice', email: 'alice@example.com', password: 'password123' };
      const dataArg = payload;

      const expectedUser = { id: '1', ...payload };
      User.create.mockResolvedValue(expectedUser);

      // Act
      const result = await createUser(dataArg);

      // Assert
      expect(result.password).toBeUndefined();
      expect(result.name).toBe(payload.name);
      expect(result.email).toBe(payload.email);

      expect(User.create).toHaveBeenCalledWith({
        name: payload.name,
        email: payload.email,
      });
      expect(cacheService.del).toHaveBeenCalledWith('users:all');
    });

    it('should handle errors when creation fails (Error Handling)', async () => {
      // Arrange
      const error = new Error('Creation Error');
      const payload = { name: 'Bob', email: 'bob@example.com', password: 'password123' };
      const dataArg = payload;

      User.create.mockRejectedValue(error);

      // Act & Assert
      await expect(createUser(dataArg)).rejects.toThrow(error);
    });
  });

  describe('updateUser', () => {
    it('should successfully update a user (Happy Path)', async () => {
      // Arrange
      const id = '1';
      const payload = { name: 'Alice Updated' };
      const idArg = id;
      const dataArg = payload;

      const expectedUser = { id, ...payload, email: 'alice@example.com' };
      const userMock = { ...expectedUser, update: jest.fn().mockResolvedValue(true) };
      User.findByPk.mockResolvedValue(userMock);

      // Act
      const result = await updateUser(idArg, dataArg);
      expect(result.name).toBe(payload.name);

      expect(cacheService.del).toHaveBeenCalledWith('users:all');
    });

    it('should handle 404/errors when user not found or update fails', async () => {
      // Arrange
      const id = '999';
      const idArg = id;
      const dataArg = { name: 'Fail' };
      User.findByPk.mockResolvedValue(null);
      await expect(updateUser(idArg, dataArg)).rejects.toThrow(ERROR_MESSAGES.USER_NOT_FOUND);
    });

    it('should handle database errors during update (Error Handling)', async () => {
      // Arrange
      const id = '1';
      const error = new Error('Database Error');
      User.findByPk.mockRejectedValue(error);
      await expect(updateUser(id, { name: 'Fail' })).rejects.toThrow(error);
    });
  });

  describe('deleteUser', () => {
    it('should successfully delete a user (Happy Path)', async () => {
      // Arrange
      const id = '1';
      const idArg = id;

      const userMock = { id, destroy: jest.fn().mockResolvedValue(true) };
      User.findByPk.mockResolvedValue(userMock);

      // Act
      const result = await deleteUser(idArg);
      expect(result).toBe(true);

      expect(cacheService.del).toHaveBeenCalledWith('users:all');
    });

    it('should handle user not found during deletion (Error Handling)', async () => {
      const id = '999';
      User.findByPk.mockResolvedValue(null);
      await expect(deleteUser(id)).rejects.toThrow(ERROR_MESSAGES.USER_NOT_FOUND);
    });

    it('should handle database errors during deletion (Error Handling)', async () => {
      const id = '1';
      const error = new Error('Database Error');
      User.findByPk.mockRejectedValue(error);
      await expect(deleteUser(id)).rejects.toThrow(error);
    });
  });

  describe('createUser Error Paths', () => {
    it('should handle database errors during creation (Error Handling)', async () => {
      const error = new Error('Database Error');
      User.create.mockRejectedValue(error);
      await expect(createUser({ name: 'Alice', email: 'alice@example.com' })).rejects.toThrow(
        error,
      );
    });
  });

  describe('updateUser Error Paths', () => {
    it('should handle database errors during update (Error Handling)', async () => {
      const id = '1';
      const error = new Error('Database Error');
      const userMock = { id, update: jest.fn().mockRejectedValue(error) };
      User.findByPk.mockResolvedValue(userMock);
      await expect(updateUser(id, { name: 'Bob' })).rejects.toThrow(error);
    });
  });
});
