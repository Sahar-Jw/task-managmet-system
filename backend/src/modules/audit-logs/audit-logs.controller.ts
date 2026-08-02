import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditLogsService } from './audit-logs.service';
import { SearchAuditLogsDto } from './dto/search-audit-logs.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../shared/enums/role.enum';

@ApiTags('audit-logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  // GET /audit-logs — search/filter (NFR-AUD-03)
  @Get()
  search(@Query() query: SearchAuditLogsDto) {
    return this.auditLogsService.search(query);
  }

  // GET /audit-logs/:id
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.auditLogsService.findOne(id);
  }
}
