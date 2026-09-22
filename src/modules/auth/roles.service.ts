import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto.js';
import { Permission } from './entities/permission.entity.js';
import { Role } from './entities/role.entity.js';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,
  ) {}

  findAllRoles() {
    return this.rolesRepository.find();
  }

  findAllPermissions() {
    return this.permissionsRepository.find();
  }

  async findRoleWithPermissions(id: string) {
    const role = await this.rolesRepository.findOne({
      where: { id },
      relations: { permissions: true },
    });

    if (!role) {
      throw new NotFoundException(`Role #${id} not found`);
    }

    return role;
  }

  async updateRolePermissions(id: string, dto: UpdateRolePermissionsDto) {
    const role = await this.findRoleWithPermissions(id);


    role.permissions = dto.permissionIds.length
      ? await this.permissionsRepository.find({
          where: { id: In(dto.permissionIds) },
        })
      : [];
    return this.rolesRepository.save(role);
  }
}
