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
    const user = await UserModel.findById(id);
    if (!user) return null;
    return { id: user._id.toString(), name: user.name, email: user.email };
  }

  async getUsers() {
    const users = await UserModel.find();
    return users.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    }));
  }

  async update(id, data) {
    const user = await UserModel.findByIdAndUpdate(id, data, { new: true });
    if (!user) return null;
    return { id: user._id.toString(), name: user.name, email: user.email };
  }

  async delete(id) {
    const result = await UserModel.findByIdAndDelete(id);
    return !!result;
  }
}

module.exports = UserRepository;
