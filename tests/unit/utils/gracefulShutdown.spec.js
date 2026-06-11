const setupGracefulShutdown = require('@/utils/gracefulShutdown');

jest.mock('@/config/database', () => {
  return {
    close: jest.fn().mockResolvedValue(true),
  };
});

jest.mock('@/config/redisClient', () => {
  return {
    quit: jest.fn().mockResolvedValue(true),
  };
});

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('Graceful Shutdown', () => {
  let mockServer;
  let mockExit;
  let processListeners;

  beforeEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
    jest.clearAllMocks();
    processListeners = {};

    mockServer = {
      close: jest.fn().mockImplementation((cb) => {
        if (cb) Promise.resolve().then(() => cb());
        return mockServer;
      }),
    };

    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
    jest.spyOn(process, 'on').mockImplementation((event, handler) => {
      processListeners[event] = handler;
      return process;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('should register SIGTERM and SIGINT events', () => {
    setupGracefulShutdown(mockServer);
    expect(processListeners['SIGTERM']).toBeDefined();
    expect(processListeners['SIGINT']).toBeDefined();
  });

  it('should cleanly shutdown all connections and exit 0', async () => {
    setupGracefulShutdown(mockServer);

    processListeners['SIGTERM']();

    await flushPromises();
    await flushPromises();
    await flushPromises();

    expect(mockServer.close).toHaveBeenCalled();

    const sequelize = require('@/config/database');
    expect(sequelize.close).toHaveBeenCalled();

    const redisService = require('@/config/redisClient');
    expect(redisService.quit).toHaveBeenCalled();

    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('should exit 0 on SIGINT', async () => {
    setupGracefulShutdown(mockServer);
    processListeners['SIGINT']();
    await flushPromises();
    await flushPromises();
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('should handle errors during shutdown and exit 1', async () => {
    // Force server.close to fail to test the error path
    mockServer.close.mockImplementationOnce((cb) => {
      if (cb) Promise.resolve().then(() => cb(new Error('Server Close Error')));
      return mockServer;
    });

    setupGracefulShutdown(mockServer);
    processListeners['SIGTERM']();

    await flushPromises();
    await flushPromises();

    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should forcefully shutdown if cleanup takes too long', async () => {
    setupGracefulShutdown(mockServer);
    processListeners['SIGTERM']();

    jest.advanceTimersByTime(15000);

    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
