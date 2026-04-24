const authMiddleware = require('@/infrastructure/webserver/middleware/authMiddleware');
const JwtService = require('@/infrastructure/auth/jwtService');
const HTTP_STATUS = require('@/utils/httpCodes');

jest.mock('@/infrastructure/auth/jwtService');
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

describe('AuthMiddleware', () => {
  let mockReq;
  let mockRes;
  let next;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should return 401 if no authorization header', async () => {
    await authMiddleware(mockReq, mockRes, next);
    expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if token is blacklisted', async () => {
    const user = { id: 1, email: 'test@example.com', jti: 'blacklisted-jti' };
    mockReq.headers.authorization = 'Bearer valid-token';
    JwtService.verifyToken.mockReturnValue(user);

    // Mock the blacklist check

    cacheService.get.mockResolvedValue(true);

    await authMiddleware(mockReq, mockRes, next);

    expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Token revoked' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if session is expired (sid not in activeTokens)', async () => {
    const user = { id: 1, email: 'test@example.com', jti: 'valid-jti', sid: 'expired-sid' };
    mockReq.headers.authorization = 'Bearer valid-token';
    JwtService.verifyToken.mockReturnValue(user);

    cacheService.get.mockImplementation((key) => {
      if (key.startsWith('blacklist:')) return Promise.resolve(false);
      if (key === 'refresh_tokens:1') return Promise.resolve(['other-sid']);
      return Promise.resolve(null);
    });

    await authMiddleware(mockReq, mockRes, next);

    expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Session expired' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should set req.user and call next if token is valid, not blacklisted and session is active', async () => {
    const user = { id: 1, jti: 'valid-jti', sid: 'active-sid' };
    mockReq.headers.authorization = 'Bearer valid-token';
    JwtService.verifyToken.mockReturnValue(user);

    cacheService.get.mockImplementation((key) => {
      if (key.startsWith('blacklist:')) return Promise.resolve(false);
      if (key === 'refresh_tokens:1') return Promise.resolve(['active-sid']);
      return Promise.resolve(null);
    });

    await authMiddleware(mockReq, mockRes, next);

    expect(mockReq.user).toEqual(user);
    expect(next).toHaveBeenCalled();
  });
});
