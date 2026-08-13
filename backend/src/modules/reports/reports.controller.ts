import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ReportsService } from './reports.service';
import { ReportFiltersDto } from './dto/report-filters.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../shared/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserEntity } from '../users/entities/user.entity';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // Admin-only: org-wide breakdown by status/priority/department.
  @Get('task-summary')
  @Roles(RoleName.ADMIN)
  taskSummary(@Query() filters: ReportFiltersDto) {
    return this.reportsService.taskSummary(filters);
  }

  // Any authenticated user. Admins see org-wide (or filtered) numbers;
  // everyone else is pinned to their own branch + department server-side,
  // regardless of what branchId/departmentId they pass in the query.
  @Get('monthly-summary')
  monthlySummary(@Query() filters: ReportFiltersDto, @CurrentUser() user: UserEntity) {
    const scoped =
      user.role.name === RoleName.ADMIN
        ? filters
        : { ...filters, branchId: user.branchId, departmentId: user.departmentId ?? undefined };
    return this.reportsService.monthlySummary(scoped, filters.months ?? 12);
  }

  // Admin-only: per-user completion rate, ratings, overdue counts.
  @Get('user-performance')
  @Roles(RoleName.ADMIN)
  userPerformance(@Query() filters: ReportFiltersDto) {
    return this.reportsService.userPerformance(filters);
  }

  // Any authenticated user. Non-admins only ever get their own branch's row.
  @Get('branch-overview')
  branchOverview(@CurrentUser() user: UserEntity) {
    const scopeBranchId = user.role.name === RoleName.ADMIN ? undefined : user.branchId;
    return this.reportsService.branchOverview(scopeBranchId);
  }

  // Any authenticated user. Non-admins only ever get their own department's row.
  @Get('department-overview')
  departmentOverview(@CurrentUser() user: UserEntity) {
    const scopeDepartmentId =
      user.role.name === RoleName.ADMIN ? undefined : user.departmentId ?? undefined;
    return this.reportsService.departmentOverview(scopeDepartmentId);
  }
}
