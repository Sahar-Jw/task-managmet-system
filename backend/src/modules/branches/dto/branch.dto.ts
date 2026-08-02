import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBranchDto {
  @IsString() @IsNotEmpty() @MaxLength(150)
  name!: string;

  @IsString() @IsNotEmpty() @MaxLength(20)
  code!: string;

  @IsOptional() @IsString() @MaxLength(255)
  address?: string;
}

export class UpdateBranchDto {
  @IsOptional() @IsString() @MaxLength(150)
  name?: string;

  @IsOptional() @IsString() @MaxLength(255)
  address?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
