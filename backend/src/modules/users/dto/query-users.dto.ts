import { IsBooleanString, IsDateString, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/utils/pagination.dto';

export class QueryUsersDto extends PaginationQueryDto {
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsUUID() roleId?: string;
  @IsOptional() @IsBooleanString() isActive?: string;
  @IsOptional() search?: string;

  // Date of join (User.createdAt) range filter
  @IsOptional() @IsDateString() joinDateFrom?: string;
  @IsOptional() @IsDateString() joinDateTo?: string;
}