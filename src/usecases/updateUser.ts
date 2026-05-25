import { User } from '@/domain/user';
import { UserRepository } from '@/infrastructure/repositories/UserRepository';

export default class UpdateUser {
  constructor(private userRepository: UserRepository) {}

  async execute(id: number | string, data: Partial<User>) {
    const user = await this.userRepository.update(id, data);

    return user;
  }
}
