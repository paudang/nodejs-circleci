import { Request, Response, NextFunction } from 'express';

import { JwtService, JwtPayload } from '@/infrastructure/auth/jwtService';

import { HTTP_STATUS } from '@/utils/httpCodes';

interface CustomRequest extends Request {
  user?: JwtPayload;
}

export const authMiddleware = async (req: CustomRequest, res: Response, next: NextFunction) => {
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
    const expiryDate = JwtService.blacklistedTokens.get(decoded.jti);
    if (expiryDate && Date.now() < expiryDate) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'Token revoked' });
    }
  }

  if (decoded.sid) {
    const activeTokens = JwtService.activeRefreshTokens.get(String(decoded.id)) || [];
    if (!activeTokens.includes(decoded.sid)) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'Session expired' });
    }
  }

  req.user = decoded;
  next();
};
