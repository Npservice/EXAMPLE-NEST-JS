import { IsArray, IsUUID } from 'class-validator';

export class UpdateRolePermissionsDto {
  @IsArray({ message: 'harus berupa array' })
  @IsUUID('4', { each: true, message: 'berisi id permission yang tidak valid' })
  permission_ids: string[];
}
