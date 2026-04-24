const JwtService = require('../../../infrastructure/auth/jwtService');
const HTTP_STATUS = require('../../../utils/httpCodes');
const cacheService = require('../../../infrastructure/caching/redisClient');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = JwtService.verifyToken(token);

  if (!decoded) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'Invalid or expired token' });
  }

  if (decoded.jti) {
    const isBlacklisted = await cacheService.get(`blacklist:${decoded.jti}`);
    if (isBlacklisted) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'Token revoked' });
    }
  }

  if (decoded.sid) {
    const cacheKey = `refresh_tokens:${decoded.id}`;
    const activeTokens = (await cacheService.get(cacheKey)) || [];
    if (!activeTokens.includes(decoded.sid)) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'Session expired' });
    }
  }

  req.user = decoded;
  next();
};

module.exports = authMiddleware;
