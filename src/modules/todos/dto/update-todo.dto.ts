import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateTodoDto } from './create-todo.dto.js';

/** Semua field opsional, yang tidak dikirim tidak diubah. */
export class UpdateTodoDto extends PartialType(CreateTodoDto) {
  @IsOptional()
  @IsBoolean({ message: 'harus true atau false' })
  is_completed?: boolean;
}
