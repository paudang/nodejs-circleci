const { emailWorker } = require('@/utils/queues/emailWorker');

jest.mock('bullmq', () => {
  return {
    Worker: jest.fn().mockImplementation((name, processor) => ({
      name,
      processor,
      on: jest.fn(),
    })),
  };
});

jest.mock('@/config/redisClient', () => ({}));

describe('Email Worker', () => {
  it('should be initialized', () => {
    expect(emailWorker).toBeDefined();
    expect(emailWorker.name).toBe('email-queue');
  });
});
