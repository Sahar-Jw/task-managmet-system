import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { IsPhoneNumber12 } from '../../../common/validators/is-phone-number.decorator';

// POST /teams/my/employees — a Team Leader creates an employee directly
// (as an alternative to sharing the invite link). The employee is always
// created as role USER and linked to the leader's Team, Department and
// Branch — there is nothing else for the leader to choose.
export class CreateTeamEmployeeDto {
  @IsString() @IsNotEmpty() @MaxLength(150)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString() @MinLength(8)
  password!: string;

  @IsOptional() @IsString() @IsPhoneNumber12() phone?: string;
}
