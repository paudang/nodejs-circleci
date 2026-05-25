import { UserRepository } from '@/infrastructure/repositories/UserRepository';

export default class GetUserById {
  constructor(private userRepository: UserRepository) {}

  async execute(id: string | number) {
    const user = await this.userRepository.findById(id);

    return user;
  }
}
