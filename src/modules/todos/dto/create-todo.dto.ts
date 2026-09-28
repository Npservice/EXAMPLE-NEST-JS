import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTodoDto {
  @IsNotEmpty({ message: 'wajib diisi' })
  @MaxLength(255, { message: 'maksimal 255 karakter' })
  title: string;

  @IsOptional()
  @IsString({ message: 'harus berupa teks' })
  description?: string;
}
