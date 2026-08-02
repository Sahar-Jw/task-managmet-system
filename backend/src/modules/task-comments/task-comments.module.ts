import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskCommentEntity } from './entities/task-comment.entity';
import { TaskEntity } from '../tasks/entities/task.entity';
import { TaskAssignmentEntity } from '../task-assignments/entities/task-assignment.entity';
import { TaskCommentsService } from './task-comments.service';
import { TaskCommentsController } from './task-comments.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaskCommentEntity, TaskEntity, TaskAssignmentEntity]),
    AuditLogsModule,
    NotificationsModule,
  ],
  providers: [TaskCommentsService],
  controllers: [TaskCommentsController],
  exports: [TaskCommentsService],
})
export class TaskCommentsModule {}
