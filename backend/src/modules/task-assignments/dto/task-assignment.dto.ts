import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateAssignmentDto {
  @IsUUID() assigneeId!: string;
  @IsOptional() @IsDateString() dueDate?: string;
}

// BR-042: rejection requires a reason with a minimum length.
export class RejectAssignmentDto {
  @IsString() @IsNotEmpty() @MinLength(10)
  reason!: string;
}

export class ReassignAssignmentDto {
  @IsUUID() newAssigneeId!: string;
  @IsOptional() @IsDateString() dueDate?: string;
}
