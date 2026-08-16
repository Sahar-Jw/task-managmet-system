import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';

import {
  JwtAuthGuard,
} from '../../common/guards/jwt-auth.guard';

import {
  RolesGuard,
} from '../../common/guards/roles.guard';

import {
  Roles,
} from '../../common/decorators/roles.decorator';

import {
  RoleName,
} from '../../shared/enums/role.enum';

import {
  AuditLogsService,
} from './audit-logs.service';

import {
  SearchAuditLogsDto,
} from './dto/search-audit-logs.dto';


@ApiTags(
  'audit-logs',
)
@ApiBearerAuth()
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
@Roles(
  RoleName.ADMIN,
)
@Controller(
  'audit-logs',
)
export class AuditLogsController {
  constructor(
    private readonly auditLogsService:
      AuditLogsService,
  ) {}


  /*
   * ==========================================================
   * SEARCH
   * ==========================================================
   */

  @Get()
  search(
    @Query()
    query:
      SearchAuditLogsDto,
  ) {
    return this.auditLogsService.search(
      query,
    );
  }


  /*
   * ==========================================================
   * FILTER METADATA
   * ==========================================================
   */

  @Get(
    'meta',
  )
  meta() {
    return this.auditLogsService.getMeta();
  }


  /*
   * ==========================================================
   * GET ONE
   * ==========================================================
   */

  @Get(
    ':id',
  )
  findOne(
    @Param(
      'id',
      ParseUUIDPipe,
    )
    id: string,
  ) {
    return this.auditLogsService.findOne(
      id,
    );
  }
}