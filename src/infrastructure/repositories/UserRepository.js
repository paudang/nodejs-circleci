const UserModel = require('../database/models/User');

class UserRepository {
  async save(user) {
    const newUser = await UserModel.create({
      name: user.name,
      email: user.email,
      password: user.password,
    });
    // Ensure password is not returned in the save result
    const result = { ...user, id: newUser.id || newUser._id.toString() };
    delete result.password;
    return result;
  }

  async findById(id) {
    const user = await UserModel.findByPk(id);
    if (!user) return null;
    return { id: user.id || 0, name: user.name, email: user.email };
  }

  async findByEmail(email) {
    const user = await UserModel.findOne({ where: { email } });
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      googleId: user.googleId,
      githubId: user.githubId,
    };
  }

  async getUsers() {
    const users = await UserModel.findAll();
    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
    }));
  }

  async update(id, data) {
    const user = await UserModel.findByPk(id);
    if (!user) return null;
    await user.update(data);
    return { id: user.id || 0, name: user.name, email: user.email };
  }

  async delete(id) {
    const user = await UserModel.findByPk(id);
    if (!user) return false;
    await user.destroy();
    return true;
  }
}

module.exports = UserRepository;
