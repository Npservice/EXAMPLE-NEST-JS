import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** Query list: `?page=0&size=10&search=`. Page mulai dari 0. */
export class PageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'harus berupa angka' })
  @Min(0, { message: 'minimal 0' })
  page: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'harus berupa angka' })
  @Min(1, { message: 'minimal 1' })
  @Max(100, { message: 'maksimal 100' })
  size: number = 10;

  @IsOptional()
  @IsString({ message: 'harus berupa teks' })
  search?: string;
}
