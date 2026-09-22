import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { User } from './entities/user.entity.js';

interface FindAllParams {
  page: number;
  size: number;
  search?: string;
}

@Injectable()
export class UsersRepository extends Repository<User> {
  constructor(private readonly dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  findByEmail(email: string) {
    return this.findOne({ where: { email } });
  }

  findByEmailWithPassword(email: string) {
    return this.createQueryBuilder('user')
      .addSelect('user.password')
      .leftJoinAndSelect('user.roles', 'roles')
      .leftJoinAndSelect('roles.permissions', 'permissions')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findAllPaginated({ page, size, search }: FindAllParams) {
    const query = this.createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles')
      .leftJoinAndSelect('roles.permissions', 'permissions')
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * size)
      .take(size);

    if (search) {
      query.andWhere('(user.name LIKE :search OR user.email LIKE :search)', {
        search: `%${search}%`,
      });
    }

    const [items, total] = await query.getManyAndCount();
    return { items, total };
  }

  findOneWithRelations(id: string) {
    return this.findOne({
      where: { id },
      relations: { roles: { permissions: true } },
    });
  }
}
