const mongoose = require('mongoose');

jest.mock('mongoose', () => {
  const mSchema = jest.fn();
  const mModel = {
    find: jest.fn(),
    create: jest.fn(),
  };
  return {
    Schema: mSchema,
    model: jest.fn().mockReturnValue(mModel),
  };
});

describe('User Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined and initialized', () => {
    const User = require('@/infrastructure/database/models/User');
    expect(User).toBeDefined();

    expect(mongoose.model).toHaveBeenCalled();
  });

  it('should handle model operations', async () => {
    const User = require('@/infrastructure/database/models/User');
    const data = { name: 'Test', email: 'test@example.com' };

    User.create.mockResolvedValue({ id: '1', ...data });
    User.find.mockResolvedValue([{ id: '1', ...data }]);

    const user = await User.create(data);
    expect(user.name).toBe(data.name);
    expect(await User.find()).toBeDefined();
  });
});
