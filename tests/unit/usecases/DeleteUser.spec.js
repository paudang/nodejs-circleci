const DeleteUser = require('@/usecases/DeleteUser');
const UserRepository = require('@/infrastructure/repositories/UserRepository');
const cacheService = require('@/infrastructure/caching/redisClient');

jest.mock('@/infrastructure/repositories/UserRepository', () => {
  return jest.fn().mockImplementation(() => ({
    save: jest.fn(),
    findById: jest.fn(),
    getUsers: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  }));
});
jest.mock('@/infrastructure/caching/redisClient', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
}));

describe('DeleteUser UseCase', () => {
  let deleteUser;
  let mockUserRepository;

  beforeEach(() => {
    mockUserRepository = new UserRepository();
    deleteUser = new DeleteUser(mockUserRepository);
    jest.clearAllMocks();
  });

  it('should delete and return the user', async () => {
    const id = 1;
    const expectedResult = { id, name: 'Deleted User', email: 'test@test.com' };

    mockUserRepository.delete.mockResolvedValue(expectedResult);

    const result = await deleteUser.execute(id);

    expect(mockUserRepository.delete).toHaveBeenCalledWith(id);
    expect(result).toEqual(expectedResult);
    expect(cacheService.del).toHaveBeenCalledWith('users:all');
  });

  it('should throw an error if repository fails', async () => {
    const error = new Error('Database error');
    mockUserRepository.delete.mockRejectedValue(error);

    await expect(deleteUser.execute(1)).rejects.toThrow(error);
  });
});
