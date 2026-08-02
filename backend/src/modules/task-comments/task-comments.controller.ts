import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TaskCommentsService } from './task-comments.service';
import { CreateCommentDto, UpdateCommentDto } from './dto/task-comment.dto';
import { UserEntity } from '../users/entities/user.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('task-comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class TaskCommentsController {
  constructor(private readonly commentsService: TaskCommentsService) {}

  @Get('tasks/:taskId/comments')
  findForTask(@Param('taskId') taskId: string, @CurrentUser() user: UserEntity) {
    return this.commentsService.findForTask(taskId, user);
  }

  @Post('tasks/:taskId/comments')
  create(
    @Param('taskId') taskId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.commentsService.create(taskId, dto, user);
  }

  @Patch('comments/:id')
  update(@Param('id') id: string, @Body() dto: UpdateCommentDto, @CurrentUser() user: UserEntity) {
    return this.commentsService.update(id, dto, user);
  }

  @Delete('comments/:id')
  remove(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    return this.commentsService.remove(id, user);
  }
}
