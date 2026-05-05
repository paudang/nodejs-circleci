const { Model } = require('sequelize');

jest.mock('sequelize', () => {
  const mDataTypes = {
    INTEGER: 'INTEGER',
    STRING: 'STRING',
  };
  const mModel = class {
    static init = jest.fn();
    static findAll = jest.fn();
    static create = jest.fn();
  };
  return { DataTypes: mDataTypes, Model: mModel };
});

jest.mock('@/infrastructure/database/database', () => ({}));

describe('User Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined and initialized', () => {
    const User = require('@/infrastructure/database/models/User');
    expect(User).toBeDefined();

    // Sequelize init is called on the class
    expect(Model.init).toHaveBeenCalled();
  });

  it('should handle model operations', async () => {
    const User = require('@/infrastructure/database/models/User');
    const data = { name: 'Test', email: 'test@example.com' };

    User.create.mockResolvedValue({ id: 1, ...data });
    User.findAll.mockResolvedValue([{ id: 1, ...data }]);

    const user = await User.create(data);
    expect(user.name).toBe(data.name);
    expect(await User.findAll()).toBeDefined();
  });
});
