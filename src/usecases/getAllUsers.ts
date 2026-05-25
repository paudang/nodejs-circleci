import { UserRepository } from '@/infrastructure/repositories/UserRepository';

export default class GetAllUsers {
  constructor(private userRepository: UserRepository) {}

  async execute() {
    const users = await this.userRepository.getUsers();

    return users;
  }
}
