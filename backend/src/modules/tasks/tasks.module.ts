import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskEntity } from './entities/task.entity';
import { ProjectEntity } from '../projects/entities/project.entity';
import { SettingEntity } from '../settings/entities/setting.entity';
import { UserEntity } from '../users/entities/user.entity';
import { TaskAssignmentEntity } from '../task-assignments/entities/task-assignment.entity';
import { TaskCommentEntity } from '../task-comments/entities/task-comment.entity';
import { TaskAttachmentEntity } from '../task-attachments/entities/task-attachment.entity';
import { TaskRatingEntity } from '../task-ratings/entities/task-rating.entity';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TaskEntity,
      ProjectEntity,
      SettingEntity,
      UserEntity,
      TaskAssignmentEntity,
      TaskCommentEntity,
      TaskAttachmentEntity,
      TaskRatingEntity,
    ]),
    AuditLogsModule,
    ProjectsModule,
  ],
  providers: [TasksService],
  controllers: [TasksController],
  exports: [TasksService],
})
export class TasksModule {}
