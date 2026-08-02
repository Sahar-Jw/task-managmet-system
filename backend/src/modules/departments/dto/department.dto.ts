import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDepartmentDto {
  @IsString() @IsNotEmpty() @MaxLength(150)
  name!: string;

  @IsString() @IsNotEmpty() @MaxLength(20)
  code!: string;
}

export class UpdateDepartmentDto {
  @IsOptional() @IsString() @MaxLength(150)
  name?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
