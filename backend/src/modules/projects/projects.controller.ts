import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { ProjectsService } from './projects.service';
import { CreateProjectDto, QueryProjectsDto, UpdateProjectDto } from './dto/project.dto';
import { UserEntity } from '../users/entities/user.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../shared/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // A User only sees Projects they created themselves; Admin sees all.
  @Get()
  findAll(@Query() query: QueryProjectsDto, @CurrentUser() user: UserEntity) {
    return this.projectsService.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    return this.projectsService.findOne(id, user);
  }

  @Post()
  // @Roles(RoleName.ADMIN)
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: UserEntity) {
    return this.projectsService.create(dto, user);
  }

  // Admin can edit any Project; a User can edit only their own
  // (ownership enforced in the service).
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto, @CurrentUser() user: UserEntity) {
    return this.projectsService.update(id, dto, user);
  }

  // Hard delete. Admin can delete any Project, a User only their own, and
  // only while it has no Tasks attached (service enforces both).
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    return this.projectsService.remove(id, user);
  }

  // BR-024: archive instead of delete once a Project has real work on it.
  // Admin-only.
  @Post(':id/archive')
  @Roles(RoleName.ADMIN)
  archive(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    return this.projectsService.archive(id, user);
  }

  @Post(':id/unarchive')
  @Roles(RoleName.ADMIN)
  unarchive(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    return this.projectsService.unarchive(id, user);
  }
}