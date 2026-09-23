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
import { IsPhoneNumber12 } from '../../../common/validators/is-phone-number.decorator';

// Kept for shape reference / potential future admin-invite flow, but not
// wired to any endpoint — account creation is self-service only via
// POST /auth/register (see RegisterUserDto below).
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

  @IsOptional() @IsString() @IsPhoneNumber12() phone?: string;
}

export class UpdateOwnProfileDto {
  @IsOptional() @IsString() @MaxLength(150) fullName?: string;
  @IsOptional() @IsString() @IsPhoneNumber12() phone?: string;
  @IsOptional() @IsString() avatarUrl?: string;
  @IsOptional() @IsString() locale?: string;
  @IsOptional() @IsString() timezone?: string;
}

export class AdminUpdateUserDto extends UpdateOwnProfileDto {
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsUUID() roleId?: string;
  // Nullable on purpose: this is how an Admin clears a User's department
  // when promoting them to the ADMIN role (Admins don't belong to a
  // Department — see UsersService.applyDepartmentRule). @IsOptional()
  // already treats `null` as "skip validation", same as `undefined`, so
  // a plain @IsUUID() alongside it is enough — no extra handling needed.
  @IsOptional() @IsUUID() departmentId?: string | null;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ChangeOwnPasswordDto {
  @IsString() @IsNotEmpty() currentPassword!: string;
  @IsString() @MinLength(8) newPassword!: string;
}

// Public self-registration has two paths: with an inviteToken (from a
// Team Leader's shared link) you join that leader's Team as an
// employee, inheriting their Department/Branch/Team. Without one, you
// become a brand-new Team Leader with your own Team and invite link.
export class RegisterUserDto {
  @IsString() @IsNotEmpty() @MaxLength(150)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString() @MinLength(8)
  password!: string;

  @IsOptional() @IsString() @IsNotEmpty()
  inviteToken?: string;

  @IsOptional() @IsString() @IsPhoneNumber12() phone?: string;
}