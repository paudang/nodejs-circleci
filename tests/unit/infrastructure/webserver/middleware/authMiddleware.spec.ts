import { authMiddleware } from '@/infrastructure/webserver/middleware/authMiddleware';
import { JwtService } from '@/infrastructure/auth/jwtService';
import { HTTP_STATUS } from '@/utils/httpCodes';
import { Request, Response, NextFunction } from 'express';

jest.mock('@/infrastructure/auth/jwtService');

describe('AuthMiddleware', () => {
  let mockRequest: any;
  let mockResponse: any;
  const nextFunction: NextFunction = jest.fn();

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it('should return 401 if no authorization header is provided', async () => {
    await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'No token provided' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 if token is invalid', async () => {
    mockRequest.headers.authorization = 'Bearer invalid-token';
    (JwtService.verifyToken as jest.Mock).mockReturnValue(null);

    await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 if token is blacklisted', async () => {
    const payload = { id: 1, email: 'test@example.com', jti: 'blacklisted-jti' };
    mockRequest.headers.authorization = 'Bearer valid-token';
    (JwtService.verifyToken as jest.Mock).mockReturnValue(payload);

    // Mock the blacklist check

    JwtService.blacklistedTokens.set('blacklisted-jti', Date.now() + 10000);

    await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Token revoked' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 if session is expired (sid not in activeTokens)', async () => {
    const payload = { id: 1, email: 'test@example.com', jti: 'valid-jti', sid: 'expired-sid' };
    mockRequest.headers.authorization = 'Bearer valid-token';
    (JwtService.verifyToken as jest.Mock).mockReturnValue(payload);

    JwtService.blacklistedTokens.delete('valid-jti');
    JwtService.activeRefreshTokens.set('1', ['other-sid']);

    await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Session expired' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should call next() and set req.user if token is valid, not blacklisted and session is active', async () => {
    const payload = { id: 1, email: 'test@example.com', jti: 'valid-jti', sid: 'active-sid' };
    mockRequest.headers.authorization = 'Bearer valid-token';
    (JwtService.verifyToken as jest.Mock).mockReturnValue(payload);

    JwtService.blacklistedTokens.delete('valid-jti');
    JwtService.activeRefreshTokens.set('1', ['active-sid']);

    await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockRequest.user).toEqual(payload);
    expect(nextFunction).toHaveBeenCalled();
  });
});
