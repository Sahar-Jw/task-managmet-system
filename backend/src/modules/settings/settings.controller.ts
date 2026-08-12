import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { CreateSettingDto, QuerySettingsDto, UpdateSettingDto } from './dto/setting.dto';
import { UserEntity } from '../users/entities/user.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RoleName } from '../../shared/enums/role.enum';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * Single polymorphic endpoint for the old Departments and Branches lists,
 * plus generic Project Settings. Callers pick a "table" via ?type=
 * (department | branch | project_setting) on GET, and pass `type` in the
 * body on create.
 */
@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  findAll(@Query() query: QuerySettingsDto) {
    return this.settingsService.findAll(query.type);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.settingsService.findOne(id);
  }

  @Post()
  @Roles(RoleName.ADMIN)
  create(@Body() dto: CreateSettingDto, @CurrentUser() user: UserEntity) {
    return this.settingsService.create(dto, user);
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateSettingDto, @CurrentUser() user: UserEntity) {
    return this.settingsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(RoleName.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    return this.settingsService.remove(id, user);
  }
}
