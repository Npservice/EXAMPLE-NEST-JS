import type { DataSource } from 'typeorm';
import { Permission } from '../../modules/auth/entities/permission.entity.js';
import { Role } from '../../modules/auth/entities/role.entity.js';

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'users:create',
    'users:read',
    'users:update',
    'users:delete',
    'roles:read',
    'roles:update',
  ],
  editor: ['users:read', 'users:update'],
  user: ['users:read'],
};

export async function seedRoles(dataSource: DataSource) {
  const rolesRepository = dataSource.getRepository(Role);
  const permissionsRepository = dataSource.getRepository(Permission);

  for (const [name, permissionNames] of Object.entries(ROLE_PERMISSIONS)) {
    const permissions = await permissionsRepository.find({
      where: permissionNames.map((permissionName) => ({
        name: permissionName,
      })),
    });

    let role = await rolesRepository.findOne({
      where: { name },
      relations: { permissions: true },
    });

    if (!role) {
      role = rolesRepository.create({ name, permissions });
      await rolesRepository.save(role);
      console.log(
        `[seed] role "${name}" dibuat dengan permission: ${permissionNames.join(', ')}`,
      );
      continue;
    }

    const currentNames = new Set(role.permissions.map((p) => p.name));
    const missing = permissions.filter((p) => !currentNames.has(p.name));

    if (missing.length === 0) {
      console.log(`[seed] role "${name}" sudah ada & permission lengkap, skip`);
      continue;
    }

    role.permissions = [...role.permissions, ...missing];
    await rolesRepository.save(role);
    console.log(
      `[seed] role "${name}" ditambah permission: ${missing.map((p) => p.name).join(', ')}`,
    );
  }
}
