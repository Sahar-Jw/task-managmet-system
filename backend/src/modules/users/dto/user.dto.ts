import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString() @IsNotEmpty() @MaxLength(150)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString() @MinLength(8)
  password!: string;

  @IsUUID() roleId!: string;
  @IsUUID() departmentId!: string;
  @IsUUID() branchId!: string;

  @IsOptional() @IsString() phone?: string;
}

export class UpdateOwnProfileDto {
  @IsOptional() @IsString() @MaxLength(150) fullName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() avatarUrl?: string;
  @IsOptional() @IsString() locale?: string;
  @IsOptional() @IsString() timezone?: string;
}

export class AdminUpdateUserDto extends UpdateOwnProfileDto {
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsUUID() roleId?: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ChangeOwnPasswordDto {
  @IsString() @IsNotEmpty() currentPassword!: string;
  @IsString() @MinLength(8) newPassword!: string;
}

export class RegisterUserDto {
  @IsString() @IsNotEmpty() @MaxLength(150)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString() @MinLength(8)
  password!: string;

  @IsUUID() branchId!: string;
  @IsUUID() departmentId!: string;

  @IsOptional() @IsString() phone?: string;
}
