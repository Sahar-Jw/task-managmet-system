import {
  IsBooleanString,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

import {
  PaginationQueryDto,
} from '../../../common/utils/pagination.dto';


/*
 * ============================================================
 * CREATE PROJECT
 * ============================================================
 */

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;


  @IsOptional()
  @IsString()
  description?: string;


  @IsOptional()
  @IsDateString()
  startDate?: string;


  @IsOptional()
  @IsDateString()
  endDate?: string;
}


/*
 * ============================================================
 * UPDATE PROJECT
 * ============================================================
 */

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;


  @IsOptional()
  @IsString()
  description?: string;


  @IsOptional()
  @IsDateString()
  startDate?: string;


  @IsOptional()
  @IsDateString()
  endDate?: string;
}


/*
 * ============================================================
 * QUERY PROJECTS
 * ============================================================
 */

export class QueryProjectsDto extends PaginationQueryDto {
  /*
   * ----------------------------------------------------------
   * Search
   * ----------------------------------------------------------
   */

  @IsOptional()
  @IsString()
  @MaxLength(300)
  search?: string;


  /*
   * Legacy filters.
   *
   * Kept so any older frontend code continues to work.
   */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;


  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;


  /*
   * ----------------------------------------------------------
   * Status / scope
   * ----------------------------------------------------------
   */

  @IsOptional()
  @IsString()
  status?: string;


  @IsOptional()
  @IsBooleanString()
  excludeArchived?: string;


  @IsOptional()
  @IsBooleanString()
  mine?: string;


  /*
   * Projects that contain at least one Task assigned to the current
   * actor (used by the "Assigned to me" tab — projects the actor did
   * not create but has work in).
   */
  @IsOptional()
  @IsBooleanString()
  assignedToMe?: string;


  /*
   * ----------------------------------------------------------
   * Organization / owner
   * ----------------------------------------------------------
   */

  @IsOptional()
  @IsUUID()
  ownerId?: string;


  @IsOptional()
  @IsUUID()
  departmentId?: string;


  @IsOptional()
  @IsUUID()
  branchId?: string;


  /*
   * ----------------------------------------------------------
   * Created date
   * ----------------------------------------------------------
   */

  @IsOptional()
  @IsDateString()
  createdDateFrom?: string;


  @IsOptional()
  @IsDateString()
  createdDateTo?: string;


  /*
   * ----------------------------------------------------------
   * Project start date
   * ----------------------------------------------------------
   */

  @IsOptional()
  @IsDateString()
  startDateFrom?: string;


  @IsOptional()
  @IsDateString()
  startDateTo?: string;


  /*
   * ----------------------------------------------------------
   * Project end date
   * ----------------------------------------------------------
   */

  @IsOptional()
  @IsDateString()
  endDateFrom?: string;


  @IsOptional()
  @IsDateString()
  endDateTo?: string;


  /*
   * ----------------------------------------------------------
   * Sorting
   * ----------------------------------------------------------
   */

  @IsOptional()
  @IsIn([
    'name',
    'status',
    'createdAt',
    'startDate',
    'endDate',
  ])
  sortBy?: string;


  @IsOptional()
  @IsIn([
    'asc',
    'desc',
  ])
  sortDir?: string;
}