import {
  Body,
  Controller,
  Get,
  Patch,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';

import {
  TaskWorkflowService,
} from './task-workflow.service';

import {
  UpdateTaskWorkflowDto,
} from './dto/task-workflow.dto';

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
  CurrentUser,
} from '../../common/decorators/current-user.decorator';

import {
  RoleName,
} from '../../shared/enums/role.enum';

import {
  UserEntity,
} from '../users/entities/user.entity';


@ApiTags(
  'task-workflow',
)
@ApiBearerAuth()
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
@Controller(
  'task-workflow',
)
export class TaskWorkflowController {
  constructor(
    private readonly workflowService:
      TaskWorkflowService,
  ) {}


  /*
   * Everyone needs to read this because Task Details uses it.
   */
  @Get()
  getConfig() {
    return this.workflowService.getConfig();
  }


  /*
   * Only Admin can change the Workflow.
   */
  @Patch()
  @Roles(
    RoleName.ADMIN,
  )
  update(
    @Body()
    dto:
      UpdateTaskWorkflowDto,

    @CurrentUser()
    user:
      UserEntity,
  ) {
    return this.workflowService.update(
      dto,
      user,
    );
  }
}