import { IsEmail, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'format email tidak valid' })
  email: string;

  @IsNotEmpty({ message: 'wajib diisi' })
  password: string;
}
