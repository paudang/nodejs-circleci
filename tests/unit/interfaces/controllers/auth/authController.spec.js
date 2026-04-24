const AuthController = require('@/interfaces/controllers/auth/authController');
const JwtService = require('@/infrastructure/auth/jwtService');
const HTTP_STATUS = require('@/utils/httpCodes');
const bcrypt = require('bcryptjs');

jest.mock('bcryptjs');
jest.mock('@/infrastructure/auth/jwtService');
jest.mock('@/infrastructure/database/models/User', () => ({
  findOne: jest.fn(),
}));
const User = require('@/infrastructure/database/models/User');
jest.mock(
  '@/infrastructure/caching/redisClient',
  () => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  }),
  { virtual: true },
);
const cacheService = require('@/infrastructure/caching/redisClient');

describe('AuthController', () => {
  let controller;
  let mockReq;
  let mockRes;
  let next;

  beforeEach(() => {
    controller = new AuthController();
    mockReq = {
      body: {},
      headers: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return tokens on success', async () => {
      const user = { id: 1, email: 'test@test.com', password: 'hashedpassword' };
      mockReq.body = { email: 'test@test.com', password: 'password123' };
      User.findOne.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(true);
      JwtService.generateToken.mockReturnValue('mock-access-token');
      JwtService.generateRefreshToken.mockReturnValue('mock-refresh-token');
      JwtService.decodeToken.mockReturnValue({ jti: 'test-jti' });

      // Mock cacheService

      cacheService.get.mockResolvedValue([]);
      cacheService.set.mockResolvedValue();

      await controller.login(mockReq, mockRes, next);

      expect(JwtService.generateToken).toHaveBeenCalledWith(
        expect.objectContaining({ sid: 'test-jti' }),
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        token: 'mock-access-token',
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });
    });

    it('should return 401 on invalid email', async () => {
      mockReq.body = { email: 'wrong@test.com', password: 'password123' };
      User.findOne.mockResolvedValue(null);

      await controller.login(mockReq, mockRes, next);

      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
    });

    it('should return 401 on invalid password', async () => {
      const user = { id: 1, email: 'test@test.com', password: 'hashedpassword' };
      mockReq.body = { email: 'test@test.com', password: 'wrongpassword' };
      User.findOne.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(false);

      await controller.login(mockReq, mockRes, next);

      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
    });
  });

  describe('refresh', () => {
    it('should return new tokens for a valid refresh token', async () => {
      mockReq.body = { refreshToken: 'valid-refresh' };
      const decoded = { id: '1', email: 'test@test.com', jti: 'old-jti' };
      JwtService.verifyRefreshToken.mockReturnValue(decoded);
      JwtService.generateToken.mockReturnValue('new-access');
      JwtService.generateRefreshToken.mockReturnValue('new-refresh');
      JwtService.decodeToken.mockReturnValue({ jti: 'new-jti' });

      cacheService.get.mockResolvedValue(['old-jti']);
      cacheService.set.mockResolvedValue();

      await controller.refresh(mockReq, mockRes, next);

      expect(JwtService.generateToken).toHaveBeenCalledWith(
        expect.objectContaining({ sid: 'new-jti' }),
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });
    });

    it('should detect theft and revoke if jti is not active', async () => {
      mockReq.body = { refreshToken: 'stolen-refresh' };
      const decoded = { id: '1', email: 'test@test.com', jti: 'stolen-jti' };
      JwtService.verifyRefreshToken.mockReturnValue(decoded);

      cacheService.get.mockResolvedValue(['different-jti']);

      await controller.refresh(mockReq, mockRes, next);

      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
    });
  });

  describe('logout', () => {
    it('should blacklist access jti and remove refresh jti', async () => {
      mockReq.headers.authorization = 'Bearer access-token';
      mockReq.body = { refreshToken: 'refresh-token' };

      JwtService.decodeToken
        .mockReturnValueOnce({ jti: 'access-jti', exp: Math.floor(Date.now() / 1000) + 3600 })
        .mockReturnValueOnce({ id: '1', jti: 'refresh-jti' });

      await controller.logout(mockReq, mockRes, next);

      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
    });
  });
});
