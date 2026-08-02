import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskAssignmentEntity } from './entities/task-assignment.entity';
import { TaskEntity } from '../tasks/entities/task.entity';
import { UserEntity } from '../users/entities/user.entity';
import { TaskAssignmentsService } from './task-assignments.service';
import { TaskAssignmentsController } from './task-assignments.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaskAssignmentEntity, TaskEntity, UserEntity]),
    AuditLogsModule,
    NotificationsModule,
  ],
  providers: [TaskAssignmentsService],
  controllers: [TaskAssignmentsController],
  exports: [TaskAssignmentsService],
})
export class TaskAssignmentsModule {}
