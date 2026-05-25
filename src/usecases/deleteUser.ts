import { UserRepository } from '@/infrastructure/repositories/UserRepository';

export default class DeleteUser {
  constructor(private userRepository: UserRepository) {}

  async execute(id: number | string) {
    const result = await this.userRepository.delete(id);

    return result;
  }
}
