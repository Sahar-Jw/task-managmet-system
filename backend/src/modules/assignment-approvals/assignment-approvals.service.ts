import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { appError } from '../../common/errors/app-error';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssignmentApprovalEntity } from './entities/assignment-approval.entity';
import { TaskAssignmentEntity } from '../task-assignments/entities/task-assignment.entity';
import { TaskEntity } from '../tasks/entities/task.entity';
import { UserEntity } from '../users/entities/user.entity';
import { ApproveDto, RejectApprovalDto } from './dto/assignment-approval.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TaskStatus } from '../../shared/enums/task-status.enum';
import { AuditAction } from '../../shared/enums/audit-action.enum';
import { ApprovalDecision } from '../../shared/enums/approval-decision.enum';
import { RoleName } from '../../shared/enums/role.enum';
import { NotificationType } from '../../shared/enums/notification-type.enum';
import { formatTaskDetails } from '../../shared/utils/task-notification.util';

@Injectable()
export class AssignmentApprovalsService {
  constructor(
    @InjectRepository(AssignmentApprovalEntity)
    private readonly approvalRepo: Repository<AssignmentApprovalEntity>,
    @InjectRepository(TaskAssignmentEntity)
    private readonly assignmentRepo: Repository<TaskAssignmentEntity>,
    @InjectRepository(TaskEntity)
    private readonly taskRepo: Repository<TaskEntity>,
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Submits the Task (via its Assignment) for approval.
  async submitForApproval(assignmentId: string, actor: UserEntity): Promise<TaskEntity> {
    const assignment = await this.assignmentRepo.findOne({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException(appError('ASSIGNMENT_NOT_FOUND', 'Assignment not found'));
    if (assignment.assigneeId !== actor.id) {
      throw new ForbiddenException(appError('ONLY_ASSIGNEE_MAY_SUBMIT_TASK_APPROVAL', 'Only the Assignee may submit this Task for approval'));
    }

    const task = await this.taskRepo.findOne({ where: { id: assignment.taskId } });
    if (!task) throw new NotFoundException(appError('TASK_NOT_FOUND', 'Task not found'));

    task.status = TaskStatus.PENDING_APPROVAL;
    const saved = await this.taskRepo.save(task);

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'Task',
      entityId: task.id,
      action: AuditAction.STATUS_CHANGE,
      newValue: { status: TaskStatus.PENDING_APPROVAL },
    });

    return saved;
  }

  // BR-050: only designated approver (Admin) may approve/reject.
  // BR-053: approval/rejection always capture actor, timestamp, reason.
  async approve(assignmentId: string, dto: ApproveDto, actor: UserEntity): Promise<AssignmentApprovalEntity> {
    return this.decide(assignmentId, ApprovalDecision.APPROVED, dto.reason, actor);
  }

  // BR-049: rejection requires a reason.
  async reject(assignmentId: string, dto: RejectApprovalDto, actor: UserEntity): Promise<AssignmentApprovalEntity> {
    return this.decide(assignmentId, ApprovalDecision.REJECTED, dto.reason, actor);
  }

  private async decide(
    assignmentId: string,
    decision: ApprovalDecision,
    reason: string | undefined,
    actor: UserEntity,
  ): Promise<AssignmentApprovalEntity> {
    if (actor.role.name !== RoleName.ADMIN) {
      throw new ForbiddenException(appError('ONLY_ADMIN_DELEGATED_APPROVER_MAY_APPROVE_REJECT', 'Only Admin (or a delegated approver) may approve or reject')); // BR-050
    }

    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId },
      relations: ['assignee'],
    });
    if (!assignment) throw new NotFoundException(appError('ASSIGNMENT_NOT_FOUND', 'Assignment not found'));

    const task = await this.taskRepo.findOne({ where: { id: assignment.taskId } });
    if (!task) throw new NotFoundException(appError('TASK_NOT_FOUND', 'Task not found'));
    if (task.status !== TaskStatus.PENDING_APPROVAL) {
      throw new ConflictException(appError('TASK_NOT_PENDING_APPROVAL', 'Task is not currently pending approval'));
    }

    // BR-051: an approval decision, once recorded, is immutable; a reversal
    // requires a new, separately logged decision.
    const approval = await this.approvalRepo.save(
      this.approvalRepo.create({
        assignmentId,
        approverId: actor.id,
        decision,
        reason,
        decidedAt: new Date(),
      }),
    );

    task.status = decision === ApprovalDecision.APPROVED ? TaskStatus.COMPLETED : TaskStatus.IN_PROGRESS;
    if (task.status === TaskStatus.COMPLETED) task.actualEndDate = new Date();
    await this.taskRepo.save(task);

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'AssignmentApproval',
      entityId: approval.id,
      action: decision === ApprovalDecision.APPROVED ? AuditAction.APPROVE : AuditAction.REJECT,
      reason,
      newValue: {
        taskId: task.id,
        taskTitle: task.title,
        assigneeId: assignment.assigneeId,
        assigneeName: assignment.assignee?.fullName,
        decision,
      },
    });

    await this.notificationsService.dispatch({
      recipientId: assignment.assigneeId,
      type: NotificationType.APPROVAL_DECISION,
      title: `Task ${decision === ApprovalDecision.APPROVED ? 'approved' : 'rejected'}`,
      message: `${actor.fullName} ${decision.toLowerCase()} your submission for "${task.title}".${formatTaskDetails(task)}${reason ? ` Reason: ${reason}` : ''}`,
      metadata: {
        taskId: task.id,
        assignmentId,
        actorId: actor.id,
        actorName: actor.fullName,
        taskTitle: task.title,
        decision,
        reason,
      },
    });

    return approval;
  }
}
