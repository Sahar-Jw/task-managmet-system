import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import {
  Type,
} from 'class-transformer';

import {
  AuditAction,
} from '../../../shared/enums/audit-action.enum';


export class SearchAuditLogsDto {
  /*
   * ==========================================================
   * ACTOR
   * ==========================================================
   */

  @IsOptional()
  @IsUUID()
  actorId?: string;


  /*
   * ==========================================================
   * ENTITY
   * ==========================================================
   */

  @IsOptional()
  @IsString()
  @MaxLength(100)
  entityType?: string;


  @IsOptional()
  @IsUUID()
  entityId?: string;


  /*
   * ==========================================================
   * ACTION
   * ==========================================================
   */

  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;


  /*
   * ==========================================================
   * SEARCH
   * ==========================================================
   *
   * Searches:
   *
   * - actor name
   * - actor email
   * - entity type
   * - entity id
   * - reason
   */

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;


  /*
   * ==========================================================
   * DATE
   * ==========================================================
   */

  @IsOptional()
  @IsDateString()
  dateFrom?: string;


  @IsOptional()
  @IsDateString()
  dateTo?: string;


  /*
   * ==========================================================
   * SORT
   * ==========================================================
   */

  @IsOptional()
  @IsIn([
    'asc',
    'desc',
  ])
  sortDir?: string;


  /*
   * ==========================================================
   * PAGINATION
   * ==========================================================
   */

  @IsOptional()
  @Type(
    () =>
      Number,
  )
  @IsInt()
  @Min(1)
  page?: number;


  @IsOptional()
  @Type(
    () =>
      Number,
  )
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}