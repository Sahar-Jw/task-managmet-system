import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssignmentApprovalEntity } from './entities/assignment-approval.entity';
import { TaskAssignmentEntity } from '../task-assignments/entities/task-assignment.entity';
import { TaskEntity } from '../tasks/entities/task.entity';
import { AssignmentApprovalsService } from './assignment-approvals.service';
import { AssignmentApprovalsController } from './assignment-approvals.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AssignmentApprovalEntity, TaskAssignmentEntity, TaskEntity]),
    AuditLogsModule,
    NotificationsModule,
  ],
  providers: [AssignmentApprovalsService],
  controllers: [AssignmentApprovalsController],
  exports: [AssignmentApprovalsService],
})
export class AssignmentApprovalsModule {}
