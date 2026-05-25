import { User } from '@/domain/user';
import { UserRepository } from '@/infrastructure/repositories/UserRepository';
import bcrypt from 'bcryptjs';

export default class CreateUser {
  constructor(private userRepository: UserRepository) {}

  async execute(name: string, email: string, password?: string) {
    let finalPassword = password;
    if (password) {
      finalPassword = await bcrypt.hash(password, 10);
    }
    const user = new User(null, name, email, finalPassword);
    const savedUser = await this.userRepository.save(user);

    return savedUser;
  }
}
