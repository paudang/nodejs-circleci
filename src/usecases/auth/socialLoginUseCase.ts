import { ISocialProvider } from '@/infrastructure/auth/socialAuthService';
import { JwtService } from '@/infrastructure/auth/jwtService';
import { UserRepository } from '@/infrastructure/repositories/UserRepository';
import { User } from '@/domain/user';

export class SocialLoginUseCase {
  constructor(
    private provider: ISocialProvider,
    private userRepository: UserRepository,
  ) {}

  async execute(code: string, redirectUri?: string) {
    const profile = await this.provider.getProfile(code, redirectUri);

    if (!profile || !profile.email) {
      throw new Error('No email associated with this social account');
    }

    // 1. Find or create user
    let user = await this.userRepository.findByEmail(profile.email);

    if (!user) {
      user = new User(
        null,
        profile.name,
        profile.email,
        null,
        this.provider.name === 'Google' ? profile.id : null,
        this.provider.name === 'GitHub' ? profile.id : null,
      );
      user = await this.userRepository.save(user);
    } else {
      // Link social ID if not already linked
      let updated = false;
      if (this.provider.name === 'Google' && !user.googleId) {
        user.googleId = profile.id;
        updated = true;
      }
      if (this.provider.name === 'GitHub' && !user.githubId) {
        user.githubId = profile.id;
        updated = true;
      }
      if (updated) {
        await this.userRepository.update(user.id!, user);
      }
    }

    // 2. Generate tokens
    const userId = user.id || (user as { _id?: { toString(): string } })._id?.toString();
    const payload = { id: userId, email: user.email };
    const accessToken = JwtService.generateToken(payload);
    const refreshToken = JwtService.generateRefreshToken(payload);

    return { user, accessToken, refreshToken };
  }
}
