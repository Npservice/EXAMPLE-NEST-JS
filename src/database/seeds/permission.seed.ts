import type { DataSource } from 'typeorm';
import { Permission } from '../../modules/auth/entities/permission.entity.js';

export const PERMISSION_NAMES = [
  'users:create',
  'users:read',
  'users:update',
  'users:delete',
  'roles:read',
  'roles:update',
];

export async function seedPermissions(dataSource: DataSource) {
  const permissionsRepository = dataSource.getRepository(Permission);

  for (const name of PERMISSION_NAMES) {
    const existing = await permissionsRepository.findOne({ where: { name } });
    if (existing) {
      console.log(`[seed] permission "${name}" sudah ada, skip`);
      continue;
    }

    await permissionsRepository.save(permissionsRepository.create({ name }));
    console.log(`[seed] permission "${name}" dibuat`);
  }
}
