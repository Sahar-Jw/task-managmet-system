import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { TaskRatingsService } from './task-ratings.service';
import { RateTaskDto } from './dto/task-rating.dto';
import { UserEntity } from '../users/entities/user.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('task-ratings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks/:taskId/ratings')
export class TaskRatingsController {
  constructor(private readonly ratingsService: TaskRatingsService) {}

  @Get()
  findForTask(@Param('taskId') taskId: string) {
    return this.ratingsService.findForTask(taskId);
  }

  // BR-054 to BR-057: eligibility + upsert enforced in service
  @Post()
  rate(@Param('taskId') taskId: string, @Body() dto: RateTaskDto, @CurrentUser() user: UserEntity) {
    return this.ratingsService.rate(taskId, dto, user);
  }
}
