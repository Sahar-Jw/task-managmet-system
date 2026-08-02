import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskRatingEntity } from './entities/task-rating.entity';
import { TaskEntity } from '../tasks/entities/task.entity';
import { TaskAssignmentEntity } from '../task-assignments/entities/task-assignment.entity';
import { TaskRatingsService } from './task-ratings.service';
import { TaskRatingsController } from './task-ratings.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaskRatingEntity, TaskEntity, TaskAssignmentEntity]),
    AuditLogsModule,
  ],
  providers: [TaskRatingsService],
  controllers: [TaskRatingsController],
  exports: [TaskRatingsService],
})
export class TaskRatingsModule {}
