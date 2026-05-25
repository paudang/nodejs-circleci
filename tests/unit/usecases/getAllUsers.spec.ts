import GetAllUsers from '@/usecases/getAllUsers';
import { UserRepository } from '@/infrastructure/repositories/UserRepository';

jest.mock('@/infrastructure/repositories/UserRepository', () => ({
  UserRepository: jest.fn().mockImplementation(() => ({
    save: jest.fn(),
    findById: jest.fn(),
    getUsers: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  })),
}));

describe('GetAllUsers UseCase', () => {
  let getAllUsers: GetAllUsers;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockUserRepository = new UserRepository() as jest.Mocked<UserRepository>;
    getAllUsers = new GetAllUsers(mockUserRepository);
    jest.clearAllMocks();
  });

  it('should retrieve all users', async () => {
    const expectedUsers = [{ id: 1, name: 'Alice', email: 'alice@example.com' }];
    mockUserRepository.getUsers.mockResolvedValue(expectedUsers as any);

    const result = await getAllUsers.execute();

    expect(mockUserRepository.getUsers).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expectedUsers);
  });

  it('should throw an error if repository fails', async () => {
    const error = new Error('Database error');
    mockUserRepository.getUsers.mockRejectedValue(error);

    await expect(getAllUsers.execute()).rejects.toThrow(error);
  });
});
