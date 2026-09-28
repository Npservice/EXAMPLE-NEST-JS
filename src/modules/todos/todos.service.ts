import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type FindOptionsWhere, Like, Repository } from 'typeorm';
import { CreateTodoDto } from './dto/create-todo.dto.js';
import { ListTodosQueryDto } from './dto/list-todos-query.dto.js';
import { UpdateTodoDto } from './dto/update-todo.dto.js';
import { Todo } from './entities/todo.entity.js';

/** Todo hanya bisa diakses pemiliknya. Todo milik user lain dianggap tidak ada. */
@Injectable()
export class TodosService {
  constructor(
    @InjectRepository(Todo)
    private readonly todosRepository: Repository<Todo>,
  ) {}

  async findAll(userId: string, query: ListTodosQueryDto) {
    const filter: FindOptionsWhere<Todo> = { userId };
    if (query.is_completed) filter.isCompleted = query.is_completed === 'true';

    const search = query.search ? Like(`%${query.search}%`) : null;
    const where = search
      ? [
          { ...filter, title: search },
          { ...filter, description: search },
        ]
      : filter;

    const [content, total] = await this.todosRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.size,
      take: query.size,
    });

    return {
      content,
      page: {
        size: query.size,
        number: query.page,
        total_elements: total,
        total_pages: Math.ceil(total / query.size),
      },
    };
  }

  async findOne(userId: string, id: string) {
    const todo = await this.todosRepository.findOneBy({ id, userId });

    if (!todo) {
      throw new NotFoundException('Todo tidak ditemukan');
    }

    return todo;
  }

  create(userId: string, dto: CreateTodoDto) {
    return this.todosRepository.save(
      this.todosRepository.create({
        userId,
        title: dto.title.trim(),
        description: dto.description ?? null,
      }),
    );
  }

  async update(userId: string, id: string, dto: UpdateTodoDto) {
    const todo = await this.findOne(userId, id);

    if (dto.title !== undefined) todo.title = dto.title.trim();
    if (dto.description !== undefined) todo.description = dto.description;
    if (dto.is_completed !== undefined) {
      todo.isCompleted = dto.is_completed;
      todo.completedAt = dto.is_completed ? new Date() : null;
    }

    return this.todosRepository.save(todo);
  }

  /** Soft delete: hanya mengisi `deleted_at`. */
  async remove(userId: string, id: string) {
    const todo = await this.findOne(userId, id);
    await this.todosRepository.softRemove(todo);
  }
}
