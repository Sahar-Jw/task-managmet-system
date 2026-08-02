import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class ApproveDto {
  @IsOptional() @IsString() reason?: string; // BR-053: optional for approval
}

// BR-049: reason mandatory for rejection (minimum length enforced)
export class RejectApprovalDto {
  @IsString() @IsNotEmpty() @MinLength(10)
  reason!: string;
}
