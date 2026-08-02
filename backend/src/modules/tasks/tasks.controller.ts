import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import {
  CreateTaskDto,
  DecideTaskApprovalDto,
  QueryTasksDto,
  UpdateTaskDto,
  UpdateTaskStatusDto,
} from './dto/task.dto';
import { UserEntity } from '../users/entities/user.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RoleName } from '../../shared/enums/role.enum';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(@Query() query: QueryTasksDto) {
    return this.tasksService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  // BR-028 to BR-031: Admin or User may create
  @Post()
  @Roles(RoleName.ADMIN, RoleName.USER)
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: UserEntity) {
    return this.tasksService.create(dto, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @CurrentUser() user: UserEntity) {
    return this.tasksService.update(id, dto, user);
  }

  // BR-032 to BR-036: status-transition rules enforced in service
  @Patch(':id/status')
  changeStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTaskStatusDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.tasksService.changeStatus(id, dto, user);
  }

  // BR-032, BR-035: Admin-only reopen with mandatory reason
  @Post(':id/reopen')
  @Roles(RoleName.ADMIN)
  reopen(@Param('id') id: string, @Body() dto: UpdateTaskStatusDto, @CurrentUser() user: UserEntity) {
    return this.tasksService.changeStatus(id, { ...dto, status: dto.status }, user);
  }

  // The designated approver (or Admin) approves/rejects a Task that needs approval.
  @Patch(':id/approval')
  decideApproval(
    @Param('id') id: string,
    @Body() dto: DecideTaskApprovalDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.tasksService.decideApproval(id, dto, user);
  }

  // BR-037: soft-delete by default; ?hard=true for Admin hard delete
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Query('hard') hard: string,
    @CurrentUser() user: UserEntity,
  ) {
    return this.tasksService.remove(id, user, hard === 'true');
  }
}
