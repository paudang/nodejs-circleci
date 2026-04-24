const bcrypt = require('bcryptjs');
const User = require('../../../infrastructure/database/models/User');
const JwtService = require('../../../infrastructure/auth/jwtService');
const cacheService = require('../../../infrastructure/caching/redisClient');
const logger = require('../../../infrastructure/log/logger');
const HTTP_STATUS = require('../../../utils/httpCodes');

class AuthController {
  constructor() {
    this.login = this.login.bind(this);
    this.refresh = this.refresh.bind(this);
    this.logout = this.logout.bind(this);
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });

      if (!user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'Invalid credentials' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'Invalid credentials' });
      }

      const userId = String(user.id || user._id);
      const refreshToken = JwtService.generateRefreshToken({ id: userId, email: user.email });
      const refreshJti = JwtService.decodeToken(refreshToken)?.jti;
      const accessToken = JwtService.generateToken({
        id: userId,
        email: user.email,
        sid: refreshJti,
      });

      const cacheKey = `refresh_tokens:${userId}`;
      const activeTokens = (await cacheService.get(cacheKey)) || [];
      activeTokens.push(refreshJti);
      await cacheService.set(cacheKey, activeTokens, 7 * 24 * 60 * 60);

      res.json({ token: accessToken, accessToken, refreshToken });
    } catch (error) {
      logger.error('Login error:', error);
      next(error);
    }
  }

  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Refresh token is required' });
      }

      const decoded = JwtService.verifyRefreshToken(refreshToken);
      if (!decoded || !decoded.id || !decoded.jti) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'Invalid refresh token' });
      }

      const userId = String(decoded.id);
      const incomingJti = decoded.jti;

      const cacheKey = `refresh_tokens:${userId}`;
      let activeTokens = (await cacheService.get(cacheKey)) || [];

      if (!activeTokens.includes(incomingJti)) {
        logger.warn(`Token theft detected for user ${userId}. Revoking all sessions.`);
        await cacheService.del(cacheKey);
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'Invalid session' });
      }

      activeTokens = activeTokens.filter((t) => t !== incomingJti);
      const newRefreshToken = JwtService.generateRefreshToken({ id: userId, email: decoded.email });
      const newRefreshJti = JwtService.decodeToken(newRefreshToken)?.jti;
      const newAccessToken = JwtService.generateToken({
        id: userId,
        email: decoded.email,
        sid: newRefreshJti,
      });

      activeTokens.push(newRefreshJti);
      await cacheService.set(cacheKey, activeTokens, 7 * 24 * 60 * 60);
      res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    } catch (error) {
      logger.error('Refresh token error:', error);
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'No token provided' });
      }

      const accessTokenStr = authHeader.split(' ')[1];
      const decodedAccess = JwtService.decodeToken(accessTokenStr);

      if (decodedAccess && decodedAccess.jti && decodedAccess.exp) {
        const remainingTime = Math.max(0, decodedAccess.exp - Math.floor(Date.now() / 1000));
        if (remainingTime > 0) {
          await cacheService.set(`blacklist:${decodedAccess.jti}`, true, remainingTime);
        }
      }

      const { refreshToken } = req.body;
      if (refreshToken) {
        const decodedRefresh = JwtService.decodeToken(refreshToken);
        if (decodedRefresh && decodedRefresh.id && decodedRefresh.jti) {
          const userId = String(decodedRefresh.id);
          const cacheKey = `refresh_tokens:${userId}`;
          let activeTokens = (await cacheService.get(cacheKey)) || [];
          activeTokens = activeTokens.filter((t) => t !== decodedRefresh.jti);
          await cacheService.set(cacheKey, activeTokens, 7 * 24 * 60 * 60);
        }
      }

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      logger.error('Logout error:', error);
      next(error);
    }
  }
}

module.exports = AuthController;
