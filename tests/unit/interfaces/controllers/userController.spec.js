const UserController = require('@/interfaces/controllers/userController');
const CreateUser = require('@/usecases/CreateUser');
const GetAllUsers = require('@/usecases/GetAllUsers');
const UpdateUser = require('@/usecases/UpdateUser');
const DeleteUser = require('@/usecases/DeleteUser');

jest.mock('@/usecases/CreateUser');
jest.mock('@/usecases/GetAllUsers');
jest.mock('@/usecases/UpdateUser');
jest.mock('@/usecases/DeleteUser');
jest.mock('@/usecases/GetUserById');
jest.mock('@/infrastructure/messaging/kafkaClient', () => ({
  sendMessage: jest.fn().mockResolvedValue(undefined),
}));

describe('UserController (Clean Architecture)', () => {
  let userController;
  let mockCreateUserUseCase;
  let mockGetAllUsersUseCase;
  let mockUpdateUserUseCase;
  let mockDeleteUserUseCase;
  let mockGetUserByIdUseCase;
  let mockRequest;
  let mockResponse;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    userController = new UserController();

    // Retrieve the mocked instances created inside UserController constructor
    mockCreateUserUseCase = CreateUser.mock.instances[0];
    mockGetAllUsersUseCase = GetAllUsers.mock.instances[0];
    mockUpdateUserUseCase = UpdateUser.mock.instances[0];
    mockDeleteUserUseCase = DeleteUser.mock.instances[0];
    const GetUserById = require('@/usecases/GetUserById');
    mockGetUserByIdUseCase = GetUserById.mock.instances[0];

    mockRequest = {
      body: {},
      params: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('getUsers', () => {
    it('should return successfully (Happy Path)', async () => {
      const usersMock = [{ id: '1', name: 'Test', email: 'test@example.com' }];
      mockGetAllUsersUseCase.execute.mockResolvedValue(usersMock);

      await userController.getUsers(mockRequest, mockResponse, mockNext);
      expect(mockResponse.json).toHaveBeenCalledWith(usersMock);
      expect(mockGetAllUsersUseCase.execute).toHaveBeenCalled();
    });

    it('should handle errors correctly (Error Handling)', async () => {
      const error = new Error('UseCase Error');
      mockGetAllUsersUseCase.execute.mockRejectedValue(error);

      await userController.getUsers(mockRequest, mockResponse, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('createUser', () => {
    it('should successfully create a new user (Happy Path)', async () => {
      const payload = { name: 'Alice', email: 'alice@example.com', password: 'password123' };
      mockRequest.body = payload;
      const expectedUser = { id: '1', ...payload };
      if (expectedUser.password) delete expectedUser.password;

      mockCreateUserUseCase.execute.mockResolvedValue(expectedUser);

      await userController.createUser(mockRequest, mockResponse, mockNext);
      const { sendMessage } = require('@/infrastructure/messaging/kafkaClient');
      expect(sendMessage).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);

      expect(mockResponse.json).toHaveBeenCalledWith(expectedUser);
      expect(mockCreateUserUseCase.execute).toHaveBeenCalledWith(
        payload.name,
        payload.email,
        payload.password,
      );
    });

    it('should fail to create a user when password is missing and JWT is enabled', async () => {
      const payload = { name: 'Alice', email: 'alice@example.com' };
      mockRequest.body = payload;
      await userController.createUser(mockRequest, mockResponse, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Password is required' });
    });
  });

  describe('getUserById', () => {
    it('should return a user if found (Happy Path)', async () => {
      const id = '1';
      const userMock = { id, name: 'Test', email: 'test@example.com' };
      mockGetUserByIdUseCase.execute.mockResolvedValue(userMock);

      mockRequest.params = { id };
      await userController.getUserById(mockRequest, mockResponse, mockNext);
      expect(mockResponse.json).toHaveBeenCalledWith(userMock);
    });

    it('should return 404 if user not found (Error Handling)', async () => {
      const id = '999';
      mockGetUserByIdUseCase.execute.mockResolvedValue(null);

      mockRequest.params = { id };
      await userController.getUserById(mockRequest, mockResponse, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateUser', () => {
    it('should successfully update a user (Happy Path)', async () => {
      const id = '1';
      const payload = { name: 'Alice Updated' };
      mockRequest.params = { id };
      mockRequest.body = payload;
      const expectedUser = { id, ...payload };

      mockUpdateUserUseCase.execute.mockResolvedValue(expectedUser);

      await userController.updateUser(mockRequest, mockResponse, mockNext);
      expect(mockResponse.json).toHaveBeenCalled();
      const { sendMessage } = require('@/infrastructure/messaging/kafkaClient');
      expect(sendMessage).toHaveBeenCalled();
      expect(mockUpdateUserUseCase.execute).toHaveBeenCalledWith(id, payload);
    });

    it('should return 404 if user to update is not found (Error Handling)', async () => {
      const id = '999';
      mockUpdateUserUseCase.execute.mockResolvedValue(null);

      mockRequest.params = { id };
      await userController.updateUser(mockRequest, mockResponse, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should handle database errors during update (Error Handling)', async () => {
      const id = '1';
      const error = new Error('Database Error');
      mockUpdateUserUseCase.execute.mockRejectedValue(error);
      mockRequest.params = { id };
      await userController.updateUser(mockRequest, mockResponse, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteUser', () => {
    it('should successfully delete a user (Happy Path)', async () => {
      const id = '1';
      mockRequest.params = { id };
      mockDeleteUserUseCase.execute.mockResolvedValue(true);

      await userController.deleteUser(mockRequest, mockResponse, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      const { sendMessage } = require('@/infrastructure/messaging/kafkaClient');
      expect(sendMessage).toHaveBeenCalled();
      expect(mockDeleteUserUseCase.execute).toHaveBeenCalledWith(id);
    });

    it('should throw error if user not found during deletion (Error Handling)', async () => {
      const id = '999';
      mockRequest.params = { id };
      mockDeleteUserUseCase.execute.mockResolvedValue(false);
      await userController.deleteUser(mockRequest, mockResponse, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should handle database errors during deletion (Error Handling)', async () => {
      const id = '1';
      const error = new Error('Database Error');
      mockDeleteUserUseCase.execute.mockRejectedValue(error);
      mockRequest.params = { id };
      await userController.deleteUser(mockRequest, mockResponse, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('createUser Error Paths', () => {
    it('should handle database errors during creation (Error Handling)', async () => {
      const error = new Error('Database Error');
      mockCreateUserUseCase.execute.mockRejectedValue(error);
      mockRequest.body = { name: 'Alice', email: 'alice@example.com', password: 'password123' };
      await userController.createUser(mockRequest, mockResponse, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateUser Error Paths', () => {
    it('should handle database errors during update (Error Handling)', async () => {
      const id = '1';
      const error = new Error('Database Error');
      mockUpdateUserUseCase.execute.mockRejectedValue(error);
      mockRequest.params = { id };
      mockRequest.body = { name: 'Bob' };
      await userController.updateUser(mockRequest, mockResponse, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
