import { UserController } from '@/interfaces/controllers/userController';
import { MyContext } from '@/interfaces/graphql/context';

const userController = new UserController();

export const userResolvers = {
  Query: {
    getAllUsers: async (_: unknown, __: unknown, context: MyContext) => {
      if (!context.user) throw new Error('Unauthorized');

      const users = await userController.getUsers();
      return users;
    },
  },
  Mutation: {
    createUser: async (
      _: unknown,
      { name, email, password }: { name: string; email: string; password: string },
    ) => {
      const user = await userController.createUser({ name, email, password });
      return user;
    },
    updateUser: async (
      _: unknown,
      { id, name, email }: { id: string; name?: string; email?: string },
      context: MyContext,
    ) => {
      if (!context.user) throw new Error('Unauthorized');

      const user = await userController.updateUser(id, { name, email });
      return user;
    },
    deleteUser: async (_: unknown, { id }: { id: string }, context: MyContext) => {
      if (!context.user) throw new Error('Unauthorized');

      const result = await userController.deleteUser(id);
      return result;
    },
  },
};
