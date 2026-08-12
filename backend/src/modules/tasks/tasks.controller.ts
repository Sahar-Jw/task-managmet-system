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
  QueryMyTasksDto,
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

  // "My Tasks": everything assigned to the current user (single assignee
  // or via task_assignments), filterable by importance/rating/deadline.
  // NOTE: must stay declared before ':id' or Nest will treat "mine" as an id.
  @Get('mine')
  findMine(@Query() query: QueryMyTasksDto, @CurrentUser() user: UserEntity) {
    return this.tasksService.findMyTasks(user.id, query);
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

  // Restores an Archived Task to its pre-archive status. Admin-only.
  @Post(':id/unarchive')
  @Roles(RoleName.ADMIN)
  unarchive(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    return this.tasksService.unarchive(id, user);
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
