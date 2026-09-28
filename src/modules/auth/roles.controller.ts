import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { Permissions } from '../../common/decorators/permissions.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto.js';
import { RolesService } from './roles.service.js';

@Controller()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Permissions('roles:read')
  @ResponseMessage('Berhasil ambil data role')
  @Get('roles')
  findAllRoles() {
    return this.rolesService.findAllRoles();
  }

  @Permissions('roles:read')
  @ResponseMessage('Berhasil ambil data permission')
  @Get('permissions')
  findAllPermissions() {
    return this.rolesService.findAllPermissions();
  }

  @Permissions('roles:read')
  @ResponseMessage('Berhasil ambil data role')
  @Get('roles/:id')
  findRole(@Param('id') id: string) {
    return this.rolesService.findRoleWithPermissions(id);
  }

  @Permissions('roles:update')
  @ResponseMessage('Permission role berhasil diperbarui')
  @Patch('roles/:id/permissions')
  updateRolePermissions(
    @Param('id') id: string,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.rolesService.updateRolePermissions(id, dto);
  }
}
