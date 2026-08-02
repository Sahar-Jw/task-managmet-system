import { IsDateString, IsEnum, IsOptional, IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AuditAction } from '../../../shared/enums/audit-action.enum';

export class SearchAuditLogsDto {
  @IsOptional() @IsUUID() actorId?: string;
  @IsOptional() entityType?: string;
  @IsOptional() @IsUUID() entityId?: string;
  @IsOptional() @IsEnum(AuditAction) action?: AuditAction;
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}
