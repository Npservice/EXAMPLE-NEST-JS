import type { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Permission } from '../modules/auth/entities/permission.entity.js';
import { Role } from '../modules/auth/entities/role.entity.js';
import { FileEntity } from '../modules/files/entities/file.entity.js';
import { User } from '../modules/users/entities/user.entity.js';

export const buildDatabaseConfig = (
  config: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: config.get<string>('DB_HOST', 'localhost'),
  port: config.get<number>('DB_PORT', 3306),
  username: config.get<string>('DB_USERNAME', 'root'),
  password: config.get<string>('DB_PASSWORD', 'root'),
  database: config.get<string>('DB_DATABASE', 'example'),
  entities: [User, Role, Permission, FileEntity],
  synchronize: config.get<string>('NODE_ENV', 'development') !== 'production',
});
