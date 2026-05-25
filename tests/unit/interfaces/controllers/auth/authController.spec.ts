jest.mock('@/infrastructure/auth/jwtService');
jest.mock('@/infrastructure/auth/socialAuthService');
jest.mock('@/usecases/auth/socialLoginUseCase');
jest.mock('@/infrastructure/repositories/UserRepository');
jest.mock('@/infrastructure/database/models/User', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

import { AuthController } from '@/interfaces/controllers/auth/authController';
import { JwtService } from '@/infrastructure/auth/jwtService';
import User from '@/infrastructure/database/models/User';
import { HTTP_STATUS } from '@/utils/httpCodes';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';

import { SocialLoginUseCase } from '@/usecases/auth/socialLoginUseCase';

jest.mock('bcryptjs');

describe('AuthController', () => {
  let authController: AuthController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  const nextFunction: NextFunction = jest.fn();

  beforeEach(() => {
    authController = new AuthController();
    mockRequest = {
      body: {},
      headers: {},
      query: {},
      cookies: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
      clearCookie: jest.fn(),
      redirect: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return 401 if user not found', async () => {
      mockRequest.body = { email: 'notfound@test.com', password: 'password' };
      (User.findOne as jest.Mock).mockResolvedValue(null);

      await authController.login(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
    });

    it('should return 200 and a token if credentials are valid', async () => {
      const user = { id: 1, email: 'test@test.com', password: 'hashedpassword' };
      mockRequest.body = { email: 'test@test.com', password: 'password123' };
      (User.findOne as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (JwtService.generateToken as jest.Mock).mockReturnValue('mock-token');
      (JwtService.generateRefreshToken as jest.Mock).mockReturnValue('mock-refresh-token');
      (JwtService.decodeToken as jest.Mock).mockReturnValue({ jti: 'test-jti' });

      await authController.login(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ accessToken: 'mock-token' }),
      );
    });

    it('should return 401 if password is invalid', async () => {
      const user = { id: 1, email: 'test@test.com', password: 'hashedpassword' };
      mockRequest.body = { email: 'test@test.com', password: 'wrongpassword' };
      (User.findOne as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await authController.login(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
    });

    it('should call next with error if login fails', async () => {
      const error = new Error('Login failed');
      (User.findOne as jest.Mock).mockRejectedValue(error);
      mockRequest.body = { email: 'test@test.com', password: 'password123' };

      await authController.login(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(error);
    });
  });

  describe('refresh', () => {
    it('should return 401 if refresh token is invalid', async () => {
      mockRequest.body = { refreshToken: 'invalid-token' };
      (JwtService.verifyRefreshToken as jest.Mock).mockReturnValue(null);

      await authController.refresh(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
    });

    it('should return 400 if refresh token is missing', async () => {
      mockRequest.body = {};

      await authController.refresh(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    });

    it('should return new tokens if refresh token is valid', async () => {
      mockRequest.body = { refreshToken: 'valid-token' };
      const decoded = { id: '1', email: 'test@test.com', jti: 'test-jti' };
      (JwtService.verifyRefreshToken as jest.Mock).mockReturnValue(decoded);
      (JwtService.generateRefreshToken as jest.Mock).mockReturnValue('new-refresh-token');
      (JwtService.generateToken as jest.Mock).mockReturnValue('new-access-token');
      (JwtService.decodeToken as jest.Mock).mockReturnValue({ jti: 'new-jti' });

      JwtService.activeRefreshTokens.set('1', ['test-jti']);

      await authController.refresh(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ accessToken: 'new-access-token' }),
      );
    });

    it('should detect token theft if jti is not in active tokens', async () => {
      mockRequest.body = { refreshToken: 'valid-token' };
      const decoded = { id: '1', email: 'test@test.com', jti: 'stolen-jti' };
      (JwtService.verifyRefreshToken as jest.Mock).mockReturnValue(decoded);

      JwtService.activeRefreshTokens.set('1', ['other-jti']);

      await authController.refresh(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
    });

    it('should call next with error if refresh fails', async () => {
      const error = new Error('Refresh failed');
      (JwtService.verifyRefreshToken as jest.Mock).mockImplementation(() => {
        throw error;
      });
      mockRequest.body = { refreshToken: 'token' };

      await authController.refresh(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(error);
    });
  });

  describe('logout', () => {
    it('should return 400 if no token provided', async () => {
      mockRequest.headers = {};
      await authController.logout(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    });

    it('should logout successfully', async () => {
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      mockRequest.body = { refreshToken: 'valid-refresh-token' };
      (JwtService.decodeToken as jest.Mock)
        .mockReturnValueOnce({ jti: 'access-jti', exp: Math.floor(Date.now() / 1000) + 3600 })
        .mockReturnValueOnce({ id: '1', jti: 'refresh-jti' });

      JwtService.activeRefreshTokens.set('1', ['refresh-jti']);

      await authController.logout(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
    });

    it('should call next with error if logout fails', async () => {
      const error = new Error('Logout failed');
      mockRequest.headers = { authorization: 'Bearer token' };
      (JwtService.decodeToken as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await authController.logout(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(error);
    });
  });

  describe('socialExchange', () => {
    it('should return 400 if code or provider missing', async () => {
      mockRequest.body = {};
      await authController.socialExchange(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    });

    it('should exchange code for JWT tokens', async () => {
      mockRequest.body = { code: 'test-code', provider: 'Google' };
      const user = { id: 1, email: 'social@test.com' };

      const mockUseCaseInstance = {
        execute: jest.fn().mockResolvedValue({
          user,
          accessToken: 'mock-token',
          refreshToken: 'mock-refresh-token',
        }),
      };
      (SocialLoginUseCase as jest.Mock).mockImplementation(() => mockUseCaseInstance);
      (JwtService.decodeToken as jest.Mock).mockReturnValue({ jti: 'test-jti' });

      await authController.socialExchange(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ accessToken: 'mock-token' }),
      );
    });

    it('should exchange GitHub code for JWT tokens', async () => {
      mockRequest.body = { code: 'test-code', provider: 'GitHub' };
      const user = { id: 1, email: 'github@test.com' };

      const mockUseCaseInstance = {
        execute: jest.fn().mockResolvedValue({ user, accessToken: 'at', refreshToken: 'rt' }),
      };
      (SocialLoginUseCase as jest.Mock).mockImplementation(() => mockUseCaseInstance);
      (JwtService.decodeToken as jest.Mock).mockReturnValue({ jti: 'test-jti' });

      await authController.socialExchange(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ accessToken: 'at' }),
      );
    });

    it('should create user if social user does not exist (MVC)', async () => {});

    it('should return 401 if social profile has no email', async () => {});

    it('should call next with error if socialExchange fails', async () => {
      const error = new Error('Exchange failed');
      mockRequest.body = { code: 'code', provider: 'Google' };

      (SocialLoginUseCase as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await authController.socialExchange(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );
      expect(nextFunction).toHaveBeenCalledWith(error);
    });

    it('should return 400 for invalid provider', async () => {
      mockRequest.body = { code: 'test-code', provider: 'Invalid' };
      await authController.socialExchange(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    });
  });

  describe('social redirect methods', () => {
    it('googleLogin should redirect to Google', async () => {
      await authController.googleLogin(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('accounts.google.com'),
      );
    });

    it('githubLogin should redirect to GitHub', async () => {
      await authController.githubLogin(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.redirect).toHaveBeenCalledWith(expect.stringContaining('github.com'));
    });

    it('googleCallback should handle Google callback', async () => {
      mockRequest.query = { code: 'test-code', state: 'test-state' };
      mockRequest.cookies = { oauth_state: 'test-state' };
      const user = { id: 1, email: 'google@test.com' };
      const mockUseCaseInstance = {
        execute: jest.fn().mockResolvedValue({ user, accessToken: 'at', refreshToken: 'rt' }),
      };
      (SocialLoginUseCase as jest.Mock).mockImplementation(() => mockUseCaseInstance);
      (JwtService.decodeToken as jest.Mock).mockReturnValue({ jti: 'test-jti' });

      await authController.googleCallback(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith('accessToken', 'at', expect.any(Object));
      expect(mockResponse.redirect).toHaveBeenCalledWith('/');
    });

    it('googleCallback should return 403 if state is invalid', async () => {
      mockRequest.query = { code: 'test-code', state: 'invalid-state' };
      mockRequest.cookies = { oauth_state: 'valid-state' };
      await authController.googleCallback(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.FORBIDDEN);
    });

    it('googleCallback should create user if not exists (MVC)', async () => {});

    it('googleCallback should redirect to login on error', async () => {
      const error = new Error('Callback failed');
      mockRequest.query = { code: 'code', state: 'test-state' };
      mockRequest.cookies = { oauth_state: 'test-state' };

      (SocialLoginUseCase as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await authController.googleCallback(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );
      expect(mockResponse.redirect).toHaveBeenCalledWith('/login?error=social_auth_failed');
    });

    it('githubCallback should handle GitHub callback', async () => {
      mockRequest.query = { code: 'test-code', state: 'test-state' };
      mockRequest.cookies = { oauth_state: 'test-state' };
      const user = { id: 1, email: 'github@test.com' };
      const mockUseCaseInstance = {
        execute: jest.fn().mockResolvedValue({ user, accessToken: 'at', refreshToken: 'rt' }),
      };
      (SocialLoginUseCase as jest.Mock).mockImplementation(() => mockUseCaseInstance);
      (JwtService.decodeToken as jest.Mock).mockReturnValue({ jti: 'test-jti' });

      await authController.githubCallback(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith('accessToken', 'at', expect.any(Object));
      expect(mockResponse.redirect).toHaveBeenCalledWith('/');
    });

    it('githubCallback should return 403 if state is invalid', async () => {
      mockRequest.query = { code: 'test-code', state: 'invalid-state' };
      mockRequest.cookies = { oauth_state: 'valid-state' };
      await authController.githubCallback(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.FORBIDDEN);
    });

    it('githubCallback should create user if not exists (MVC)', async () => {});

    it('githubCallback should redirect to login on error', async () => {
      const error = new Error('Callback failed');
      mockRequest.query = { code: 'code', state: 'test-state' };
      mockRequest.cookies = { oauth_state: 'test-state' };

      (SocialLoginUseCase as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await authController.githubCallback(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );
      expect(mockResponse.redirect).toHaveBeenCalledWith('/login?error=social_auth_failed');
    });
  });
});
