import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/utils/pagination.dto';

export class QueryTeamsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
