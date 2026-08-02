import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ReportsService } from './reports.service';
import { ReportFiltersDto } from './dto/report-filters.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../shared/enums/role.enum';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('task-summary')
  taskSummary(@Query() filters: ReportFiltersDto) {
    return this.reportsService.taskSummary(filters);
  }

  @Get('user-performance')
  userPerformance(@Query() filters: ReportFiltersDto) {
    return this.reportsService.userPerformance(filters);
  }

  @Get('branch-overview')
  branchOverview() {
    return this.reportsService.branchOverview();
  }
}
