import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TaskAssignmentsService } from './task-assignments.service';
import {
  CreateAssignmentDto,
  ReassignAssignmentDto,
  RejectAssignmentDto,
} from './dto/task-assignment.dto';
import { UserEntity } from '../users/entities/user.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../shared/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('task-assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class TaskAssignmentsController {
  constructor(private readonly assignmentsService: TaskAssignmentsService) {}

  @Get('tasks/:taskId/assignments')
  findForTask(@Param('taskId') taskId: string) {
    return this.assignmentsService.findForTask(taskId);
  }

  // BR-040: Admin (or delegated assigner — delegation not yet exposed via API)
  @Post('tasks/:taskId/assignments')
  // @Roles(RoleName.ADMIN)
  assign(
    @Param('taskId') taskId: string,
    @Body() dto: CreateAssignmentDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.assignmentsService.assign(taskId, dto, user);
  }

  @Patch('assignments/:id/accept')
  accept(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    return this.assignmentsService.accept(id, user);
  }

  @Patch('assignments/:id/reject')
  reject(@Param('id') id: string, @Body() dto: RejectAssignmentDto, @CurrentUser() user: UserEntity) {
    return this.assignmentsService.reject(id, dto, user);
  }

  @Post('assignments/:id/reassign')
  @Roles(RoleName.ADMIN)
  reassign(
    @Param('id') id: string,
    @Body() dto: ReassignAssignmentDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.assignmentsService.reassign(id, dto, user);
  }
}
