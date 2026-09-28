import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { CreateTodoDto } from './dto/create-todo.dto.js';
import { ListTodosQueryDto } from './dto/list-todos-query.dto.js';
import { UpdateTodoDto } from './dto/update-todo.dto.js';
import { TodosService } from './todos.service.js';

/** `/todos`, wajib login. Tiap user hanya bisa mengakses todo miliknya sendiri. */
@Controller('todos')
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @ResponseMessage('Berhasil ambil data todo')
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListTodosQueryDto,
  ) {
    return this.todosService.findAll(user.userId, query);
  }

  @ResponseMessage('Berhasil ambil data todo')
  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.todosService.findOne(user.userId, id);
  }

  @ResponseMessage('Todo berhasil dibuat')
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTodoDto) {
    return this.todosService.create(user.userId, dto);
  }

  @ResponseMessage('Todo berhasil diperbarui')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTodoDto,
  ) {
    return this.todosService.update(user.userId, id, dto);
  }

  @ResponseMessage('Todo berhasil dihapus')
  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.todosService.remove(user.userId, id);
  }
}
