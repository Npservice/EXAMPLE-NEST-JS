import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Permission } from '../modules/auth/entities/permission.entity.js';
import { Role } from '../modules/auth/entities/role.entity.js';
import { FileEntity } from '../modules/files/entities/file.entity.js';
import { User } from '../modules/users/entities/user.entity.js';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USERNAME ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_DATABASE ?? 'example',
  entities: [User, Role, Permission, FileEntity],
});
