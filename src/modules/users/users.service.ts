import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { toPaging } from '../../common/utils/paging.util.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { ListUsersQueryDto } from './dto/list-users-query.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UsersRepository } from './users.repository.js';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(dto: CreateUserDto) {
    const password = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepository.create({ ...dto, password });
    return this.usersRepository.save(user);
  }

  async findAll(query: ListUsersQueryDto) {
    const { items, total } = await this.usersRepository.findAllPaginated(
      query,
    );
    return toPaging(items, query.size, query.page, total);
  }

  async findOne(id: string) {
    const user = await this.usersRepository.findOneWithRelations(id);

    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.findOne(id);
    const password = dto.password
      ? await bcrypt.hash(dto.password, 10)
      : undefined;
    Object.assign(user, { ...dto, ...(password && { password }) });
    return this.usersRepository.save(user);
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    await this.usersRepository.softRemove(user);
  }
}
