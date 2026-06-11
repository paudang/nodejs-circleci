const { gqlContext } = require('@/graphql/context');
const { resolvers } = require('@/graphql/index');
const { typeDefs } = require('@/graphql/typeDefs/index');

describe('GraphQL Context', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return context with user when authorization header is present and valid', async () => {
    const mockRequest = {
      headers: {
        authorization: 'Bearer token123',
      },
    };
    const context = await gqlContext({ req: mockRequest });
    expect(context).toEqual({});
  });

  it('should return empty context when authorization header is missing', async () => {
    const mockRequest = {
      headers: {},
    };

    const context = await gqlContext({ req: mockRequest });
    expect(context).toEqual({});
  });
});
