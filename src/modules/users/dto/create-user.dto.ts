import { IsEmail, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'format email tidak valid' })
  email: string;

  @IsNotEmpty({ message: 'wajib diisi' })
  @MaxLength(255, { message: 'maksimal 255 karakter' })
  name: string;

  @MinLength(6, { message: 'minimal 6 karakter' })
  password: string;
}
