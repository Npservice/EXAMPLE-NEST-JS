import { IsIn, IsOptional } from 'class-validator';
import { PageQueryDto } from '../../../common/dto/page-query.dto.js';

/** `?page=0&size=10&search=&is_completed=true|false` */
export class ListTodosQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(['true', 'false'], { message: 'harus true atau false' })
  is_completed?: 'true' | 'false';
}
