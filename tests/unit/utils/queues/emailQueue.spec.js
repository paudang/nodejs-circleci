const { emailQueue } = require('@/utils/queues/emailQueue');

jest.mock('bullmq', () => {
  return {
    Queue: jest.fn().mockImplementation((name) => ({
      name,
      add: jest.fn(),
    })),
  };
});

jest.mock('@/config/redisClient', () => ({}));

describe('Email Queue', () => {
  it('should be initialized', () => {
    expect(emailQueue).toBeDefined();
    expect(emailQueue.name).toBe('email-queue');
  });
});
