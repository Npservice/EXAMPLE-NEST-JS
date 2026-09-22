import { AppDataSource } from '../data-source.js';
import { seedPermissions } from './permission.seed.js';
import { seedRoles } from './role.seed.js';
import { seedAdminUser } from './user.seed.js';

async function run() {
  await AppDataSource.initialize();
  console.log('[seed] koneksi database tersambung');

  try {
    await seedPermissions(AppDataSource);
    await seedRoles(AppDataSource);
    await seedAdminUser(AppDataSource);
    console.log('[seed] selesai');
  } finally {
    await AppDataSource.destroy();
  }
}

run().catch((err) => {
  console.error('[seed] gagal:', err);
  process.exit(1);
});
