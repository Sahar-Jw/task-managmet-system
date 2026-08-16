import {
  IsBooleanString,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

import {
  PaginationQueryDto,
} from '../../../common/utils/pagination.dto';


export class QueryUsersDto extends PaginationQueryDto {
  /*
   * ==========================================================
   * ORGANIZATION
   * ==========================================================
   */

  @IsOptional()
  @IsUUID()
  branchId?: string;


  @IsOptional()
  @IsUUID()
  departmentId?: string;


  /*
   * ==========================================================
   * ROLE
   * ==========================================================
   */

  @IsOptional()
  @IsUUID()
  roleId?: string;


  /*
   * ==========================================================
   * ACCOUNT STATUS
   * ==========================================================
   */

  @IsOptional()
  @IsBooleanString()
  isActive?: string;


  /*
   * ==========================================================
   * SEARCH
   * ==========================================================
   */

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;


  /*
   * ==========================================================
   * JOIN DATE
   * ==========================================================
   */

  @IsOptional()
  @IsDateString()
  joinDateFrom?: string;


  @IsOptional()
  @IsDateString()
  joinDateTo?: string;


  /*
   * ==========================================================
   * SORT
   * ==========================================================
   */

  @IsOptional()
  @IsIn([
    'fullName',
    'email',
    'createdAt',
    'role',
    'isActive',
  ])
  sortBy?: string;


  @IsOptional()
  @IsIn([
    'asc',
    'desc',
  ])
  sortDir?: string;
}