import { withTimeout } from '@/utils/resilience/timeout';

jest.mock('@/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('Timeout Utility', () => {
  it('should resolve if operation completes before timeout', async () => {
    const operation = new Promise<string>((resolve) => setTimeout(() => resolve('success'), 50));
    const result = await withTimeout(operation, 100);
    expect(result).toBe('success');
  });

  it('should reject if operation exceeds timeout', async () => {
    const operation = new Promise<string>((resolve) => setTimeout(() => resolve('success'), 150));
    await expect(withTimeout(operation, 50)).rejects.toThrow('Operation timed out after 50ms');
  });
});
