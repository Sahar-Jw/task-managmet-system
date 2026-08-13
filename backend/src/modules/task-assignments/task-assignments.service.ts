import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskAssignmentEntity } from './entities/task-assignment.entity';
import { TaskEntity } from '../tasks/entities/task.entity';
import { UserEntity } from '../users/entities/user.entity';
import {
  CreateAssignmentDto,
  ReassignAssignmentDto,
  RejectAssignmentDto,
} from './dto/task-assignment.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AssignmentStatus } from '../../shared/enums/assignment-status.enum';
import { AuditAction } from '../../shared/enums/audit-action.enum';
import { NotificationType } from '../../shared/enums/notification-type.enum';
import { TaskStatus } from '../../shared/enums/task-status.enum';
import { RoleName } from '../../shared/enums/role.enum';

@Injectable()
export class TaskAssignmentsService {
  constructor(
    @InjectRepository(TaskAssignmentEntity)
    private readonly assignmentRepo: Repository<TaskAssignmentEntity>,
    @InjectRepository(TaskEntity)
    private readonly taskRepo: Repository<TaskEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  findForTask(taskId: string) {
    return this.assignmentRepo.find({
      where: { taskId },
      relations: ['assignee', 'assignedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  private async findOneOrThrow(id: string): Promise<TaskAssignmentEntity> {
    const assignment = await this.assignmentRepo.findOne({
      where: { id },
      relations: ['task', 'assignee'],
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    return assignment;
  }

  // BR-040, BR-046, BR-047, BR-048
  async assign(taskId: string, dto: CreateAssignmentDto, actor: UserEntity): Promise<TaskAssignmentEntity> {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.archivedAt) throw new BadRequestException('Cannot assign an archived Task');

    const assignee = await this.userRepo.findOne({ where: { id: dto.assigneeId }, relations: ['role'] });
    if (!assignee) throw new NotFoundException('Assignee not found');

    // BR-046: cannot assign to a deactivated User.
    if (!assignee.isActive) {
      throw new BadRequestException('Cannot assign a Task to a deactivated User');
    }

    // Admins are never a valid assignee.
    if (assignee.role.name === RoleName.ADMIN) {
      throw new BadRequestException('Cannot assign a Task to an Admin');
    }

    // NOTE: BR-047 (department-restricted assignment) has been removed per
    // product decision — any active User can be assigned to any Task,
    // regardless of department.
    // BR-048: Assignment due date cannot exceed the parent Task's due date.
    if (dto.dueDate && task.deadlineDate && dto.dueDate > task.deadlineDate) {
      throw new BadRequestException("Assignment due date cannot exceed the parent Task's due date");
    }

    // BR-041: single active assignee unless multi-assignee mode is configured (not enabled by default).
    const existingActive = await this.assignmentRepo.findOne({
      where: [
        { taskId, status: AssignmentStatus.PENDING_ACCEPTANCE },
        { taskId, status: AssignmentStatus.ACCEPTED },
      ],
    });
    if (existingActive) {
      throw new ConflictException(
        'This Task already has an active Assignment. Reassign it instead of creating a new one.',
      );
    }

    const assignment = await this.assignmentRepo.save(
      this.assignmentRepo.create({
        taskId,
        assigneeId: dto.assigneeId,
        assignedById: actor.id,
        dueDate: dto.dueDate,
        status: AssignmentStatus.PENDING_ACCEPTANCE,
      }),
    );

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'TaskAssignment',
      entityId: assignment.id,
      action: AuditAction.ASSIGN,
      newValue: assignment,
    });

    await this.notificationsService.dispatch({
      recipientId: assignee.id,
      type: NotificationType.TASK_ASSIGNED,
      title: 'New Task assigned to you',
      message: `You have been assigned to the Task "${task.titleEn}".`,
      metadata: { taskId: task.id, assignmentId: assignment.id },
    });

    return assignment;
  }

  // BR-043: only while PendingAcceptance.
  async accept(id: string, actor: UserEntity): Promise<TaskAssignmentEntity> {
    const assignment = await this.findOneOrThrow(id);
    if (assignment.assigneeId !== actor.id) {
      throw new ForbiddenException('Only the assigned User may accept this Assignment');
    }
    if (assignment.status !== AssignmentStatus.PENDING_ACCEPTANCE) {
      throw new ConflictException('Assignment is not in PendingAcceptance status');
    }

    assignment.status = AssignmentStatus.ACCEPTED;
    assignment.acceptedAt = new Date();
    const saved = await this.assignmentRepo.save(assignment);

    const task = await this.taskRepo.findOne({ where: { id: assignment.taskId } });
    if (task && (task.status === TaskStatus.PENDING || task.status === TaskStatus.UNASSIGNED)) {
      task.status = TaskStatus.IN_PROGRESS;
      await this.taskRepo.save(task);
    }

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'TaskAssignment',
      entityId: saved.id,
      action: AuditAction.UPDATE,
      newValue: { status: saved.status },
    });

    return saved;
  }

  // BR-042, BR-043, BR-044
  async reject(id: string, dto: RejectAssignmentDto, actor: UserEntity): Promise<TaskAssignmentEntity> {
    const assignment = await this.findOneOrThrow(id);

    if (assignment.status !== AssignmentStatus.PENDING_ACCEPTANCE) {
      // BR-043: once accepted, rejection requires Admin mediation (reassignment) instead.
      throw new ConflictException(
        'An accepted Assignment cannot be rejected directly; ask an Admin to reassign the Task',
      );
    }
    if (assignment.assigneeId !== actor.id && actor.role.name !== RoleName.ADMIN) {
      throw new ForbiddenException('Only the assigned User may reject this Assignment');
    }

    assignment.status = AssignmentStatus.REJECTED;
    assignment.rejectionReason = dto.reason;
    assignment.rejectedAt = new Date();
    const saved = await this.assignmentRepo.save(assignment);

    // BR-044: rejected Assignment reverts the Task to Unassigned.
    const task = await this.taskRepo.findOne({ where: { id: assignment.taskId } });
    if (task) {
      task.status = TaskStatus.UNASSIGNED;
      await this.taskRepo.save(task);
    }

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'TaskAssignment',
      entityId: saved.id,
      action: AuditAction.REJECT,
      reason: dto.reason,
      newValue: { status: saved.status },
    });

    if (task) {
      await this.notificationsService.dispatch({
        recipientId: task.createdById,
        type: NotificationType.ASSIGNMENT_REJECTED,
        title: 'Assignment rejected',
        message: `The Assignment for "${task.titleEn}" was rejected: ${dto.reason}`,
        metadata: { taskId: task.id, assignmentId: saved.id },
      });
    }

    return saved;
  }

  // BR-045: reassignment closes the previous Assignment (status: Reassigned)
  // rather than deleting it, preserving history.
  async reassign(id: string, dto: ReassignAssignmentDto, actor: UserEntity): Promise<TaskAssignmentEntity> {
    const previous = await this.findOneOrThrow(id);

    const task = await this.taskRepo.findOne({ where: { id: previous.taskId } });
    if (!task) throw new NotFoundException('Task not found');

    // BR-045: only an Admin or the User who created the Task may reassign it.
    if (actor.role.name !== RoleName.ADMIN && task.createdById !== actor.id) {
      throw new ForbiddenException('Only an Admin or the Task creator may reassign this Assignment');
    }

    const newAssignee = await this.userRepo.findOne({ where: { id: dto.newAssigneeId }, relations: ['role'] });
    if (!newAssignee) throw new NotFoundException('New assignee not found');
    if (!newAssignee.isActive) throw new BadRequestException('Cannot assign a Task to a deactivated User'); // BR-046
    if (newAssignee.role.name === RoleName.ADMIN) {
      throw new BadRequestException('Cannot assign a Task to an Admin');
    }

    // NOTE: BR-047 (department-restricted assignment) has been removed per
    // product decision — any active User can be assigned to any Task,
    // regardless of department.
    if (dto.dueDate && task.deadlineDate && dto.dueDate > task.deadlineDate) {
      throw new BadRequestException("Assignment due date cannot exceed the parent Task's due date"); // BR-048
    }

    previous.status = AssignmentStatus.REASSIGNED;
    await this.assignmentRepo.save(previous);

    const newAssignment = await this.assignmentRepo.save(
      this.assignmentRepo.create({
        taskId: previous.taskId,
        assigneeId: newAssignee.id,
        assignedById: actor.id,
        dueDate: dto.dueDate,
        status: AssignmentStatus.PENDING_ACCEPTANCE,
      }),
    );

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'TaskAssignment',
      entityId: newAssignment.id,
      action: AuditAction.REASSIGN,
      oldValue: { previousAssignmentId: previous.id, previousAssigneeId: previous.assigneeId },
      newValue: newAssignment,
    });

    await this.notificationsService.dispatch({
      recipientId: newAssignee.id,
      type: NotificationType.TASK_REASSIGNED,
      title: 'Task reassigned to you',
      message: `You have been assigned to the Task "${task.titleEn}".`,
      metadata: { taskId: task.id, assignmentId: newAssignment.id },
    });

    return newAssignment;
  }
}