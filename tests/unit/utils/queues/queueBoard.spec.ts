import serverAdapter from '@/utils/queues/queueBoard';

jest.mock('@bull-board/api', () => ({
  createBullBoard: jest.fn(),
}));
jest.mock('@bull-board/api/bullMQAdapter', () => ({
  BullMQAdapter: jest.fn(),
}));
jest.mock('@bull-board/express', () => ({
  ExpressAdapter: jest.fn().mockImplementation(() => ({
    setBasePath: jest.fn(),
    getRouter: jest.fn().mockReturnValue({}),
  })),
}));

jest.mock('@/utils/queues/emailQueue', () => ({ emailQueue: {} }));
jest.mock('@/utils/queues/emailWorker', () => ({}));

describe('Queue Board Adapter', () => {
  it('should initialize and export serverAdapter', () => {
    expect(serverAdapter).toBeDefined();
  });
});
