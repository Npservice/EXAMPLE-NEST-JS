import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Like, Repository } from 'typeorm';
import { PageQueryDto } from '../../common/dto/page-query.dto.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { User } from './entities/user.entity.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findAll(query: PageQueryDto) {
    const search = query.search ? Like(`%${query.search}%`) : undefined;
    const [content, total] = await this.usersRepository.findAndCount({
      where: search ? [{ name: search }, { email: search }] : {},
      relations: { roles: { permissions: true } },
      order: { createdAt: 'DESC' },
      skip: query.page * query.size,
      take: query.size,
    });

    return {
      content,
      page: {
        size: query.size,
        number: query.page,
        total_elements: total,
        total_pages: Math.ceil(total / query.size),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: { roles: { permissions: true } },
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    return user;
  }

  /** Untuk login: kolom password ikut diambil (default select: false). */
  findByEmailWithPassword(email: string) {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .leftJoinAndSelect('user.roles', 'roles')
      .leftJoinAndSelect('roles.permissions', 'permissions')
      .where('user.email = :email', { email })
      .getOne();
  }

  async create(dto: CreateUserDto) {
    await this.ensureEmailAvailable(dto.email);
    const password = await bcrypt.hash(dto.password, 10);
    const user = await this.usersRepository.save(
      this.usersRepository.create({ ...dto, password }),
    );
    return this.findOne(user.id);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.findOne(id);

    if (dto.email && dto.email !== user.email) {
      await this.ensureEmailAvailable(dto.email);
    }

    const password = dto.password
      ? await bcrypt.hash(dto.password, 10)
      : undefined;
    Object.assign(user, { ...dto, ...(password && { password }) });
    await this.usersRepository.save(user);
    return this.findOne(id);
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    await this.usersRepository.softRemove(user);
  }

  /** Email unik, termasuk user yang sudah di-soft delete. */
  private async ensureEmailAvailable(email: string) {
    const exists = await this.usersRepository.exists({
      where: { email },
      withDeleted: true,
    });

    if (exists) {
      throw new BadRequestException({
        message: 'Validation Failed',
        data: { email: 'email sudah terdaftar' },
      });
    }
  }
}
