import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Todo } from './entities/todo.entity.js';
import { TodosService } from './todos.service.js';

describe('TodosService', () => {
  const userId = 'user-1';
  const repository = {
    findAndCount: vi.fn(),
    findOneBy: vi.fn(),
    save: vi.fn((todo: Todo) => Promise.resolve(todo)),
    softRemove: vi.fn(),
    create: vi.fn((data: Partial<Todo>) => data),
  };
  let service: TodosService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TodosService(repository as never);
  });

  it('findAll memakai page 0-based dan filter milik user', async () => {
    repository.findAndCount.mockResolvedValue([[], 25]);

    const result = await service.findAll(userId, {
      page: 2,
      size: 10,
      is_completed: 'true',
    });

    expect(repository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId, isCompleted: true },
        skip: 20,
        take: 10,
      }),
    );
    expect(result.page).toEqual({
      size: 10,
      number: 2,
      total_elements: 25,
      total_pages: 3,
    });
  });

  it('findOne melempar 404 untuk todo milik user lain', async () => {
    repository.findOneBy.mockResolvedValue(null);

    await expect(service.findOne(userId, 'todo-x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.findOneBy).toHaveBeenCalledWith({
      id: 'todo-x',
      userId,
    });
  });

  it('update is_completed mengisi dan mengosongkan completed_at', async () => {
    const todo = { id: 't1', userId, isCompleted: false, completedAt: null };
    repository.findOneBy.mockResolvedValue(todo);

    const done = await service.update(userId, 't1', { is_completed: true });
    expect(done.isCompleted).toBe(true);
    expect(done.completedAt).toBeInstanceOf(Date);

    const undone = await service.update(userId, 't1', { is_completed: false });
    expect(undone.completedAt).toBeNull();
  });
});
