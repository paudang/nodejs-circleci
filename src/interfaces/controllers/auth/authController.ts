import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '@/infrastructure/database/models/User';
import { JwtService } from '@/infrastructure/auth/jwtService';
import logger from '@/infrastructure/log/logger';
import { SocialLoginUseCase } from '@/usecases/auth/socialLoginUseCase';
import { GoogleProvider, GitHubProvider } from '@/infrastructure/auth/socialAuthService';
import { UserRepository } from '@/infrastructure/repositories/UserRepository';
import { HTTP_STATUS } from '@/utils/httpCodes';

export class AuthController {
  private setOAuthStateCookie(res: Response, state: string) {
    res.cookie('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
    });
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'Invalid credentials' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password!);
      if (!isPasswordValid) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'Invalid credentials' });
      }

      const userId = String(user.id || (user as unknown as { _id?: string | number })._id);

      const refreshToken = JwtService.generateRefreshToken({ id: userId, email: user.email });
      const refreshJti = JwtService.decodeToken(refreshToken)?.jti;
      const accessToken = JwtService.generateToken({
        id: userId,
        email: user.email,
        sid: refreshJti,
      });

      // Store refresh token
      const activeTokens = JwtService.activeRefreshTokens.get(userId) || [];
      activeTokens.push(refreshJti!);
      JwtService.activeRefreshTokens.set(userId, activeTokens);

      res.json({ token: accessToken, accessToken, refreshToken });
    } catch (error) {
      logger.error('Login error:', error);
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
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

      let activeTokens = JwtService.activeRefreshTokens.get(userId) || [];

      if (!activeTokens.includes(incomingJti)) {
        // Theft detection!
        logger.warn(`Token theft detected for user ${userId}. Revoking all sessions.`);
        JwtService.activeRefreshTokens.delete(userId);
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

      activeTokens.push(newRefreshJti!);
      JwtService.activeRefreshTokens.set(userId, activeTokens);
      res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    } catch (error) {
      logger.error('Refresh token error:', error);
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
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
          JwtService.blacklistedTokens.set(decodedAccess.jti, Date.now() + remainingTime * 1000);
        }
      }

      const { refreshToken } = req.body;
      if (refreshToken) {
        const decodedRefresh = JwtService.decodeToken(refreshToken);
        if (decodedRefresh && decodedRefresh.id && decodedRefresh.jti) {
          const userId = String(decodedRefresh.id);
          let activeTokens = JwtService.activeRefreshTokens.get(userId) || [];
          activeTokens = activeTokens.filter((t) => t !== decodedRefresh.jti);
          JwtService.activeRefreshTokens.set(userId, activeTokens);
        }
      }

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      logger.error('Logout error:', error);
      next(error);
    }
  }

  async socialExchange(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, provider, redirectUri } = req.body;
      if (!code || !provider) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json({ message: 'Code and provider are required' });
      }

      if (!['Google', 'GitHub'].includes(provider)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Invalid social provider' });
      }

      let useCase: SocialLoginUseCase | undefined;
      const userRepository = new UserRepository();
      if (provider === 'Google')
        useCase = new SocialLoginUseCase(new GoogleProvider(), userRepository);
      if (provider === 'GitHub')
        useCase = new SocialLoginUseCase(new GitHubProvider(), userRepository);

      if (!useCase) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Invalid social provider' });
      }

      const { user, accessToken, refreshToken } = await useCase.execute(code, redirectUri);
      const userId = String(user.id || (user as unknown as { _id?: string | number })._id);
      const refreshJti = JwtService.decodeToken(refreshToken)?.jti;

      // Store refresh token
      const activeTokens = JwtService.activeRefreshTokens.get(userId) || [];
      activeTokens.push(refreshJti!);
      JwtService.activeRefreshTokens.set(userId, activeTokens);

      res.json({ token: accessToken, accessToken, refreshToken });
    } catch (error) {
      logger.error('Social exchange error:', error);
      next(error);
    }
  }

  async googleLogin(req: Request, res: Response) {
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const state = crypto.randomBytes(16).toString('hex');
    this.setOAuthStateCookie(res, state);

    const options = {
      redirect_uri:
        process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
      client_id: process.env.GOOGLE_CLIENT_ID!,
      access_type: 'offline',
      response_type: 'code',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' '),
      state: state,
    };
    const qs = new URLSearchParams(options);
    res.redirect(`${rootUrl}?${qs.toString()}`);
  }

  async googleCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, state } = req.query;
      const savedState = req.cookies?.oauth_state;
      res.clearCookie('oauth_state');

      if (!state || state !== savedState) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({ message: 'Invalid state parameter' });
      }

      const redirectUri =
        process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback';

      const useCase = new SocialLoginUseCase(new GoogleProvider(), new UserRepository());
      const { user, accessToken, refreshToken } = await useCase.execute(
        code as string,
        redirectUri,
      );
      const userId = String(user.id || (user as unknown as { _id?: string | number })._id);
      const refreshJti = JwtService.decodeToken(refreshToken)?.jti;

      // Store refresh token
      const activeTokens = JwtService.activeRefreshTokens.get(userId) || [];
      activeTokens.push(refreshJti!);
      JwtService.activeRefreshTokens.set(userId, activeTokens);

      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
      res.redirect('/');
    } catch (error) {
      logger.error('Google callback error:', error);
      res.redirect('/login?error=social_auth_failed');
    }
  }

  async githubLogin(req: Request, res: Response) {
    const rootUrl = 'https://github.com/login/oauth/authorize';
    const state = crypto.randomBytes(16).toString('hex');
    this.setOAuthStateCookie(res, state);

    const options = {
      client_id: process.env.GITHUB_CLIENT_ID!,
      redirect_uri:
        process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/api/auth/github/callback',
      scope: 'user:email',
      state: state,
    };
    const qs = new URLSearchParams(options);
    res.redirect(`${rootUrl}?${qs.toString()}`);
  }

  async githubCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, state } = req.query;
      const savedState = req.cookies?.oauth_state;
      res.clearCookie('oauth_state');

      if (!state || state !== savedState) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({ message: 'Invalid state parameter' });
      }

      const useCase = new SocialLoginUseCase(new GitHubProvider(), new UserRepository());
      const { user, accessToken, refreshToken } = await useCase.execute(code as string);
      const userId = String(user.id || (user as unknown as { _id?: string | number })._id);
      const refreshJti = JwtService.decodeToken(refreshToken)?.jti;

      // Store refresh token
      const activeTokens = JwtService.activeRefreshTokens.get(userId) || [];
      activeTokens.push(refreshJti!);
      JwtService.activeRefreshTokens.set(userId, activeTokens);

      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
      res.redirect('/');
    } catch (error) {
      logger.error('GitHub callback error:', error);
      res.redirect('/login?error=social_auth_failed');
    }
  }
}
