const UserRepository = require('@/infrastructure/repositories/UserRepository');
const UserModel = require('@/infrastructure/database/models/User');

jest.mock('@/infrastructure/database/models/User', () => ({
  create: jest.fn(),
  findAll: jest.fn(),
  findByPk: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
}));

describe('UserRepository', () => {
  let userRepository;

  beforeEach(() => {
    userRepository = new UserRepository();
    jest.clearAllMocks();
  });

  describe('save', () => {
    it('should save and return a newly created user (Happy Path)', async () => {
      const userData = { name: 'New User', email: 'new@example.com' };
      const savedData = { id: '1', ...userData };
      UserModel.create.mockResolvedValue(savedData);

      const result = await userRepository.save(userData);

      expect(UserModel.create).toHaveBeenCalledWith(userData);
      expect(result).toEqual({ id: '1', ...userData });
    });

    it('should throw an error when DB fails explicitly (Edge Case)', async () => {
      const error = new Error('DB Error');
      UserModel.create.mockRejectedValue(error);

      await expect(userRepository.save({})).rejects.toThrow('DB Error');
    });
  });

  describe('findById', () => {
    it('should return a user if found (Happy Path)', async () => {
      const id = '1';
      const userData = { id, name: 'Test User', email: 'test@example.com' };
      UserModel.findByPk.mockResolvedValue(userData);
      const result = await userRepository.findById(id);
      expect(result).toEqual(userData);
    });

    it('should return null if user not found (Error Handling)', async () => {
      const id = '999';
      UserModel.findByPk.mockResolvedValue(null);
      const result = await userRepository.findById(id);
      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find and return a user by email', async () => {
      const email = 'test@example.com';
      const mockDbRecord = { id: '1', name: 'TestUser', email: 'test@example.com' };
      UserModel.findOne.mockResolvedValue(mockDbRecord);

      const result = await userRepository.findByEmail(email);

      expect(result.email).toBe(email);
      expect(UserModel.findOne).toHaveBeenCalled();
    });

    it('should return null if email not found', async () => {
      UserModel.findOne.mockResolvedValue(null);
      const result = await userRepository.findByEmail('not@found.com');
      expect(result).toBeNull();
    });
  });

  describe('getUsers', () => {
    it('should return a list of mapped UserEntities (Happy Path)', async () => {
      const mockUsers = [
        { id: '1', name: 'User 1', email: 'u1@test.com' },
        { id: '2', name: 'User 2', email: 'u2@test.com' },
      ];
      UserModel.findAll.mockResolvedValue(mockUsers);

      const result = await userRepository.getUsers();

      expect(UserModel.findAll).toHaveBeenCalled();
      expect(result).toEqual([
        { id: '1', name: 'User 1', email: 'u1@test.com' },
        { id: '2', name: 'User 2', email: 'u2@test.com' },
      ]);
    });
  });

  describe('update', () => {
    it('should successfully update a user (Happy Path)', async () => {
      const id = '1';
      const updateData = { name: 'Updated name' };
      const updatedUser = {
        id: '1',
        ...updateData,
        email: 'test@test.com',
        update: jest.fn().mockResolvedValue(true),
      };
      UserModel.findByPk.mockResolvedValue(updatedUser);

      const result = await userRepository.update(id, updateData);
      expect(result.name).toEqual(updateData.name);
    });

    it('should handle user not found during update (Error Handling)', async () => {
      UserModel.findByPk.mockResolvedValue(null);
      const result = await userRepository.update('999', { name: 'fail' });
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should successfully delete a user (Happy Path)', async () => {
      const id = '1';
      const userMock = { id, destroy: jest.fn().mockResolvedValue(true) };
      UserModel.findByPk.mockResolvedValue(userMock);

      const result = await userRepository.delete(id);
      expect(result).toBe(true);
    });

    it('should handle user not found during deletion (Error Handling)', async () => {
      UserModel.findByPk.mockResolvedValue(null);
      const result = await userRepository.delete('999');
      expect(result).toBe(false);
    });
  });
});
