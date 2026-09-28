import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateUserDto } from './dto/create-user.dto.js';
import { User } from './entities/user.entity.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUser: User = {
    id: 'b6a1f5b0-9c3a-4e8e-8f6a-2f7e6c1d9a11',
    email: 'jane@example.com',
    name: 'Jane',
    password: 'hashed',
    roles: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockPage = {
    content: [mockUser],
    page: { size: 10, number: 0, total_elements: 1, total_pages: 1 },
  };

  const mockUsersService = {
    create: vi.fn().mockResolvedValue(mockUser),
    findAll: vi.fn().mockResolvedValue(mockPage),
    findOne: vi.fn().mockResolvedValue(mockUser),
    update: vi.fn().mockResolvedValue(mockUser),
    remove: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get(UsersController);
  });

  it('should create a user', async () => {
    const dto: CreateUserDto = {
      email: 'jane@example.com',
      name: 'Jane',
      password: 'secret123',
    };

    await expect(controller.create(dto)).resolves.toEqual(mockUser);
    expect(mockUsersService.create).toHaveBeenCalledWith(dto);
  });

  it('should return a page of users', async () => {
    const query = { page: 0, size: 10 };
    await expect(controller.findAll(query)).resolves.toEqual(mockPage);
    expect(mockUsersService.findAll).toHaveBeenCalledWith(query);
  });

  it('should return a single user', async () => {
    await expect(controller.findOne(mockUser.id)).resolves.toEqual(mockUser);
    expect(mockUsersService.findOne).toHaveBeenCalledWith(mockUser.id);
  });
});
