const userController = require('../../controllers/userController');

const userResolvers = {
  Query: {
    getAllUsers: async (_, __, _context) => {
      return await userController.getUsers();
    },
  },
  Mutation: {
    createUser: async (_, { name, email }) => {
      // Create user is typically public for registration
      const user = await userController.createUser({ name, email });
      return user;
    },
    updateUser: async (_, { id, name, email }, _context) => {
      return await userController.updateUser(id, { name, email });
    },
    deleteUser: async (_, { id }, _context) => {
      return await userController.deleteUser(id);
    },
  },
};

module.exports = { userResolvers };
