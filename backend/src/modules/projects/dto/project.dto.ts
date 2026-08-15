import { IsBooleanString, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/utils/pagination.dto';
import { ProjectStatus } from '../../../shared/enums/project-status.enum';

export class CreateProjectDto {
  @IsString() @IsNotEmpty() @MaxLength(200)
  name!: string;

  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
}

export class UpdateProjectDto {
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
}

export class QueryProjectsDto extends PaginationQueryDto {
  @IsOptional() @IsEnum(ProjectStatus) status?: ProjectStatus;
  @IsOptional() @IsBooleanString() excludeArchived?: string;

  // Admin-only convenience filter for the "My projects" tab: when 'true',
  // scope the list down to Projects the requesting Admin created
  // themselves. Ignored for a non-Admin, since they're already scoped to
  // their own Projects regardless of this flag.
  @IsOptional() @IsBooleanString() mine?: string;
}
