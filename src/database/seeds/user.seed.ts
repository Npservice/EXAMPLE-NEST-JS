import * as bcrypt from 'bcryptjs';
import type { DataSource } from 'typeorm';
import { Role } from '../../modules/auth/entities/role.entity.js';
import { User } from '../../modules/users/entities/user.entity.js';

const DEFAULT_ADMIN = {
  email: 'admin@example.com',
  name: 'Admin',
  password: 'admin12345',
};

export async function seedAdminUser(dataSource: DataSource) {
  const usersRepository = dataSource.getRepository(User);
  const rolesRepository = dataSource.getRepository(Role);

  const existing = await usersRepository.findOne({
    where: { email: DEFAULT_ADMIN.email },
  });

  if (existing) {
    console.log(`[seed] user "${DEFAULT_ADMIN.email}" sudah ada, skip`);
    return;
  }

  const adminRole = await rolesRepository.findOne({
    where: { name: 'admin' },
  });

  if (!adminRole) {
    throw new Error('Role "admin" belum ada — jalankan seedRoles() dulu');
  }

  const password = await bcrypt.hash(DEFAULT_ADMIN.password, 10);
  const user = usersRepository.create({
    email: DEFAULT_ADMIN.email,
    name: DEFAULT_ADMIN.name,
    password,
    roles: [adminRole],
  });

  await usersRepository.save(user);
  console.log(
    `[seed] user admin dibuat: ${DEFAULT_ADMIN.email} / ${DEFAULT_ADMIN.password}`,
  );
}
