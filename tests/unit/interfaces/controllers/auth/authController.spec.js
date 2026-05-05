jest.mock('@/infrastructure/auth/jwtService');
jest.mock('@/infrastructure/auth/socialAuthService');
jest.mock('@/usecases/auth/socialLoginUseCase');
jest.mock('@/infrastructure/repositories/UserRepository');
jest.mock('@/infrastructure/database/models/User', () => ({
  findOne: jest.fn(),
}));
jest.mock('bcryptjs');

const AuthController = require('@/interfaces/controllers/auth/authController');
const JwtService = require('@/infrastructure/auth/jwtService');
const { SocialAuthService } = require('@/infrastructure/auth/socialAuthService');
const { SocialLoginUseCase } = require('@/usecases/auth/socialLoginUseCase');
const User = require('@/infrastructure/database/models/User');
const HTTP_STATUS = require('@/utils/httpCodes');
const bcrypt = require('bcryptjs');

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
      query: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
      redirect: jest.fn(),
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

    it('should return 401 if user not found', async () => {
      mockReq.body = { email: 'wrong@test.com', password: 'password123' };
      User.findOne.mockResolvedValue(null);

      await controller.login(mockReq, mockRes, next);

      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
    });

    it('should return 401 if password invalid', async () => {
      const user = { id: 1, email: 'test@test.com', password: 'hashedpassword' };
      mockReq.body = { email: 'test@test.com', password: 'wrongpassword' };
      User.findOne.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(false);

      await controller.login(mockReq, mockRes, next);

      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
    });

    it('should call next on error', async () => {
      const error = new Error('Database error');
      User.findOne.mockRejectedValue(error);
      mockReq.body = { email: 'test@test.com', password: 'password123' };

      await controller.login(mockReq, mockRes, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('refresh', () => {
    it('should return 401 if refresh token is invalid', async () => {
      mockReq.body = { refreshToken: 'invalid-token' };
      JwtService.verifyRefreshToken.mockReturnValue(null);

      await controller.refresh(mockReq, mockRes, next);

      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
    });

    it('should return new tokens if refresh token is valid', async () => {
      mockReq.body = { refreshToken: 'valid-token' };
      const decoded = { id: '1', email: 'test@test.com', jti: 'test-jti' };
      JwtService.verifyRefreshToken.mockReturnValue(decoded);
      JwtService.generateRefreshToken.mockReturnValue('new-refresh-token');
      JwtService.generateToken.mockReturnValue('new-access-token');
      JwtService.decodeToken.mockReturnValue({ jti: 'new-jti' });

      cacheService.get.mockResolvedValue(['test-jti']);

      await controller.refresh(mockReq, mockRes, next);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ accessToken: 'new-access-token' }),
      );
    });

    it('should return 401 if token theft detected', async () => {
      mockReq.body = { refreshToken: 'stolen-token' };
      const decoded = { id: '1', email: 'test@test.com', jti: 'stolen-jti' };
      JwtService.verifyRefreshToken.mockReturnValue(decoded);

      cacheService.get.mockResolvedValue(['other-jti']);
      cacheService.del.mockResolvedValue();

      await controller.refresh(mockReq, mockRes, next);

      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
    });

    it('should call next on refresh error', async () => {
      const error = new Error('Redis error');
      mockReq.body = { refreshToken: 'valid-token' };
      JwtService.verifyRefreshToken.mockImplementation(() => {
        throw error;
      });

      await controller.refresh(mockReq, mockRes, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('logout', () => {
    it('should return 400 if no token provided', async () => {
      mockReq.headers = {};
      await controller.logout(mockReq, mockRes, next);
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    });

    it('should logout successfully', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' };
      mockReq.body = { refreshToken: 'valid-refresh-token' };
      JwtService.decodeToken
        .mockReturnValueOnce({ jti: 'access-jti', exp: Math.floor(Date.now() / 1000) + 3600 })
        .mockReturnValueOnce({ id: '1', jti: 'refresh-jti' });

      cacheService.get.mockResolvedValue(['refresh-jti']);

      await controller.logout(mockReq, mockRes, next);

      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
    });

    it('should handle logout even if no refresh token provided', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' };
      mockReq.body = {};
      JwtService.decodeToken.mockReturnValue({
        jti: 'access-jti',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      await controller.logout(mockReq, mockRes, next);

      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
    });

    it('should call next on logout error', async () => {
      const error = new Error('Logout error');
      mockReq.headers = { authorization: 'Bearer valid-token' };
      JwtService.decodeToken.mockImplementation(() => {
        throw error;
      });

      await controller.logout(mockReq, mockRes, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('socialExchange', () => {
    it('should return 400 if code or provider missing', async () => {
      mockReq.body = {};
      await controller.socialExchange(mockReq, mockRes, next);
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    });

    it('should exchange code for JWT tokens', async () => {
      mockReq.body = { code: 'test-code', provider: 'Google' };
      const user = { id: 1, email: 'social@test.com' };

      const mockUseCase = {
        execute: jest.fn().mockResolvedValue({
          user,
          accessToken: 'mock-token',
          refreshToken: 'mock-refresh-token',
        }),
      };
      SocialLoginUseCase.mockImplementation(() => mockUseCase);

      JwtService.decodeToken.mockReturnValue({ jti: 'test-jti' });

      await controller.socialExchange(mockReq, mockRes, next);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ accessToken: 'mock-token' }),
      );
    });

    it('should return 400 for invalid provider', async () => {
      mockReq.body = { code: 'test-code', provider: 'Invalid' };
      await controller.socialExchange(mockReq, mockRes, next);
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    });
  });

  describe('social redirect methods', () => {
    it('googleLogin should redirect to Google', async () => {
      await controller.googleLogin(mockReq, mockRes);
      expect(mockRes.redirect).toHaveBeenCalledWith(expect.stringContaining('accounts.google.com'));
    });

    it('googleCallback should handle Google callback', async () => {
      mockReq.query = { code: 'test-code' };
      const user = { id: 1, email: 'google@test.com' };

      const mockUseCase = {
        execute: jest.fn().mockResolvedValue({
          user,
          accessToken: 'mock-token',
          refreshToken: 'mock-refresh-token',
        }),
      };
      SocialLoginUseCase.mockImplementation(() => mockUseCase);

      JwtService.decodeToken.mockReturnValue({ jti: 'test-jti' });

      await controller.googleCallback(mockReq, mockRes, next);

      expect(mockRes.cookie).toHaveBeenCalledWith('accessToken', 'mock-token', expect.any(Object));
      expect(mockRes.redirect).toHaveBeenCalledWith('/');
    });

    it('githubLogin should redirect to GitHub', async () => {
      await controller.githubLogin(mockReq, mockRes);
      expect(mockRes.redirect).toHaveBeenCalledWith(expect.stringContaining('github.com'));
    });

    it('githubCallback should handle GitHub callback', async () => {
      mockReq.query = { code: 'test-code' };
      const user = { id: 1, email: 'github@test.com' };

      const mockUseCase = {
        execute: jest.fn().mockResolvedValue({
          user,
          accessToken: 'mock-token',
          refreshToken: 'mock-refresh-token',
        }),
      };
      SocialLoginUseCase.mockImplementation(() => mockUseCase);

      JwtService.decodeToken.mockReturnValue({ jti: 'test-jti' });

      await controller.githubCallback(mockReq, mockRes, next);

      expect(mockRes.cookie).toHaveBeenCalledWith('accessToken', 'mock-token', expect.any(Object));
      expect(mockRes.redirect).toHaveBeenCalledWith('/');
    });
  });
});
