jest.mock('@/infrastructure/auth/jwtService');
jest.mock('@/infrastructure/repositories/UserRepository', () => {
  return jest.fn().mockImplementation(() => ({
    findByEmail: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  }));
});
const UserRepository = require('@/infrastructure/repositories/UserRepository');

const { SocialLoginUseCase } = require('@/usecases/auth/socialLoginUseCase');
const JwtService = require('@/infrastructure/auth/jwtService');

describe('SocialLoginUseCase', () => {
  let useCase;
  let mockProvider;
  let mockRepo;

  beforeEach(() => {
    mockProvider = {
      name: 'Google',
      getProfile: jest.fn(),
    };
    mockRepo = new UserRepository();
    useCase = new SocialLoginUseCase(mockProvider, mockRepo);
    jest.clearAllMocks();
  });

  it('should find existing user and generate tokens', async () => {
    const mockProfile = { id: 'google-123', email: 'test@test.com', name: 'Test User' };
    const mockUser = { id: '1', email: 'test@test.com', googleId: null };

    mockProvider.getProfile.mockResolvedValue(mockProfile);
    mockRepo.findByEmail.mockResolvedValue(mockUser);
    JwtService.generateToken.mockReturnValue('access-token');
    JwtService.generateRefreshToken.mockReturnValue('refresh-token');

    const result = await useCase.execute('test-code');

    expect(mockRepo.findByEmail).toHaveBeenCalled();
    expect(result.accessToken).toBe('access-token');
  });

  it('should create new user if not exists', async () => {
    const mockProfile = { id: 'google-456', email: 'new@test.com', name: 'New User' };
    const mockUser = { id: '2', email: 'new@test.com' };

    mockProvider.getProfile.mockResolvedValue(mockProfile);
    mockRepo.findByEmail.mockResolvedValue(null);
    mockRepo.save.mockResolvedValue(mockUser);
    const User = require('@/domain/models/User');
    JwtService.generateToken.mockReturnValue('access-token');
    JwtService.generateRefreshToken.mockReturnValue('refresh-token');

    await useCase.execute('test-code');

    expect(mockRepo.save).toHaveBeenCalled();
  });

  it('should link GitHub ID if existing user does not have it', async () => {
    mockProvider.name = 'GitHub';
    const mockProfile = { id: 'github-789', email: 'test@test.com', name: 'Test User' };
    const mockUser = { id: '1', email: 'test@test.com', githubId: null };

    mockProvider.getProfile.mockResolvedValue(mockProfile);
    mockRepo.findByEmail.mockResolvedValue(mockUser);
    JwtService.generateToken.mockReturnValue('access-token');
    JwtService.generateRefreshToken.mockReturnValue('refresh-token');

    await useCase.execute('test-code');

    expect(mockRepo.update).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({ githubId: 'github-789' }),
    );
  });

  it('should link Google ID if existing user does not have it', async () => {
    mockProvider.name = 'Google';
    const mockProfile = { id: 'google-789', email: 'test@test.com', name: 'Test User' };
    const mockUser = { id: '1', email: 'test@test.com', googleId: null };

    mockProvider.getProfile.mockResolvedValue(mockProfile);
    mockRepo.findByEmail.mockResolvedValue(mockUser);
    JwtService.generateToken.mockReturnValue('access-token');
    JwtService.generateRefreshToken.mockReturnValue('refresh-token');

    await useCase.execute('test-code');

    expect(mockRepo.update).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({ googleId: 'google-789' }),
    );
  });

  it('should throw error if profile has no email', async () => {
    mockProvider.getProfile.mockResolvedValue({ id: '123' }); // No email
    await expect(useCase.execute('test-code')).rejects.toThrow(
      'No email associated with this social account',
    );
  });
});
