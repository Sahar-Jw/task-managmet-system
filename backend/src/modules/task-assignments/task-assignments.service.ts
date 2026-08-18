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

import { formatTaskDetails } from '../../shared/utils/task-notification.util';

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

  /*
   * ============================================================
   * LIST ASSIGNMENTS
   * ============================================================
   */

  findForTask(taskId: string) {
    return this.assignmentRepo.find({
      where: {
        taskId,
      },

      relations: [
        'assignee',
        'assignedBy',
      ],

      order: {
        createdAt: 'DESC',
      },
    });
  }

  /*
   * ============================================================
   * HELPERS
   * ============================================================
   */

  private async findOneOrThrow(
    id: string,
  ): Promise<TaskAssignmentEntity> {
    const assignment =
      await this.assignmentRepo.findOne({
        where: {
          id,
        },

        relations: [
          'task',
          'assignee',
        ],
      });

    if (!assignment) {
      throw new NotFoundException(
        appError('ASSIGNMENT_NOT_FOUND', 'Assignment not found'),
      );
    }

    return assignment;
  }

  private async getValidAssignee(
    userId: string,
  ): Promise<UserEntity> {
    const user =
      await this.userRepo.findOne({
        where: {
          id: userId,
        },

        relations: [
          'role',
        ],
      });

    if (!user) {
      throw new NotFoundException(
        appError('ASSIGNEE_NOT_FOUND', 'Assignee not found'),
      );
    }

    if (!user.isActive) {
      throw new BadRequestException(
        appError('CANNOT_ASSIGN_TASK_DEACTIVATED_USER', 'Cannot assign a Task to a deactivated User'),
      );
    }

    if (
      user.role.name ===
      RoleName.ADMIN
    ) {
      throw new BadRequestException(
        appError('CANNOT_ASSIGN_TASK_ADMIN', 'Cannot assign a Task to an Admin'),
      );
    }

    return user;
  }

  /*
   * ============================================================
   * ASSIGN
   *
   * This is now the ONLY normal assignment workflow.
   *
   * Task.assignedToId is kept synchronized only as a pointer to
   * the current assignee.
   * ============================================================
   */

  async assign(
    taskId: string,
    dto: CreateAssignmentDto,
    actor: UserEntity,
  ): Promise<TaskAssignmentEntity> {
    const task =
      await this.taskRepo.findOne({
        where: {
          id: taskId,
        },
      });

    if (!task) {
      throw new NotFoundException(
        appError('TASK_NOT_FOUND', 'Task not found'),
      );
    }

    if (
      task.archivedAt ||
      task.status ===
        TaskStatus.ARCHIVED
    ) {
      throw new BadRequestException(
        appError('CANNOT_ASSIGN_ARCHIVED_TASK', 'Cannot assign an archived Task'),
      );
    }

    /*
     * Only Task creator or Admin may initially assign.
     */
    if (
      actor.role.name !==
        RoleName.ADMIN &&
      task.createdById !==
        actor.id
    ) {
      throw new ForbiddenException(
        appError('ONLY_ADMIN_TASK_CREATOR_MAY_ASSIGN_TASK', 'Only an Admin or the Task creator may assign this Task'),
      );
    }

    const assignee =
      await this.getValidAssignee(
        dto.assigneeId,
      );

    if (
      dto.dueDate &&
      task.deadlineDate &&
      dto.dueDate >
        task.deadlineDate
    ) {
      throw new BadRequestException(
        appError('ASSIGNMENT_DUE_DATE_CANNOT_EXCEED_PARENT_TASK_S_DUE_DATE', "Assignment due date cannot exceed the parent Task's due date"),
      );
    }

    /*
     * Only one active assignment at a time.
     */
    const existingActive =
      await this.assignmentRepo.findOne({
        where: [
          {
            taskId,
            status:
              AssignmentStatus.PENDING_ACCEPTANCE,
          },

          {
            taskId,
            status:
              AssignmentStatus.ACCEPTED,
          },
        ],
      });

    if (existingActive) {
      throw new ConflictException(
        appError('TASK_ALREADY_HAS_ACTIVE_ASSIGNMENT_REASSIGN_IT_INSTEAD_CREATING_NEW_ONE', 'This Task already has an active Assignment. Reassign it instead of creating a new one.'),
      );
    }

    const assignment =
      await this.assignmentRepo.save(
        this.assignmentRepo.create({
          taskId,

          assigneeId:
            assignee.id,

          assignedById:
            actor.id,

          dueDate:
            dto.dueDate,

          status:
            AssignmentStatus.PENDING_ACCEPTANCE,
        }),
      );

    /*
     * Keep the Task pointer synchronized.
     *
     * The Assignment entity remains the source of truth for
     * acceptance/rejection/reassignment history.
     */
    task.assignedToId =
      assignee.id;

    /*
     * It is assigned but not accepted yet.
     *
     * Do NOT put it in InProgress until the user accepts.
     */
    if (
      task.status ===
      TaskStatus.UNASSIGNED
    ) {
      task.status =
        TaskStatus.PENDING;
    }

    await this.taskRepo.save(
      task,
    );

    await this.auditLogsService.record({
      actorId:
        actor.id,

      entityType:
        'TaskAssignment',

      entityId:
        assignment.id,

      action:
        AuditAction.ASSIGN,

      newValue:
        assignment,
    });

    await this.notificationsService.dispatch({
      recipientId:
        assignee.id,

      type:
        NotificationType.TASK_ASSIGNED,

      title:
        'New Task assigned to you',

      message:
        `${actor.fullName} assigned you to "${task.title}".${formatTaskDetails(task)}`,

      metadata: {
        taskId:
          task.id,

        assignmentId:
          assignment.id,

        actorName:
          actor.fullName,

        taskTitle:
          task.title,

        priority:
          task.priority,

        dueDate:
          task.deadlineDate,
      },
    });

    return assignment;
  }

  /*
   * ============================================================
   * ACCEPT
   * ============================================================
   */

  async accept(
    id: string,
    actor: UserEntity,
  ): Promise<TaskAssignmentEntity> {
    const assignment =
      await this.findOneOrThrow(
        id,
      );

    if (
      assignment.assigneeId !==
      actor.id
    ) {
      throw new ForbiddenException(
        appError('ONLY_ASSIGNED_USER_MAY_ACCEPT_ASSIGNMENT', 'Only the assigned User may accept this Assignment'),
      );
    }

    if (
      assignment.status !==
      AssignmentStatus.PENDING_ACCEPTANCE
    ) {
      throw new ConflictException(
        appError('ASSIGNMENT_NOT_IN_PENDINGACCEPTANCE_STATUS', 'Assignment is not in PendingAcceptance status'),
      );
    }

    assignment.status =
      AssignmentStatus.ACCEPTED;

    assignment.acceptedAt =
      new Date();

    const saved =
      await this.assignmentRepo.save(
        assignment,
      );

    const task =
      await this.taskRepo.findOne({
        where: {
          id:
            assignment.taskId,
        },
      });

    if (task) {
      /*
       * Synchronize pointer.
       */
      task.assignedToId =
        assignment.assigneeId;

      /*
       * Acceptance starts the work.
       */
      if (
        task.status ===
          TaskStatus.PENDING ||
        task.status ===
          TaskStatus.UNASSIGNED
      ) {
        task.status =
          TaskStatus.IN_PROGRESS;
      }

      await this.taskRepo.save(
        task,
      );
    }

    await this.auditLogsService.record({
      actorId:
        actor.id,

      entityType:
        'TaskAssignment',

      entityId:
        saved.id,

      action:
        AuditAction.UPDATE,

      newValue: {
        status:
          saved.status,
      },
    });

    if (task) {
      await this.notificationsService.dispatch({
        recipientId:
          task.createdById,

        type:
          NotificationType.ASSIGNMENT_ACCEPTED,

        title:
          'Assignment accepted',

        message:
          `${actor.fullName} accepted the assignment for "${task.title}".${formatTaskDetails(task)}`,

        metadata: {
          taskId:
            task.id,

          assignmentId:
            saved.id,

          actorName:
            actor.fullName,

          taskTitle:
            task.title,
        },
      });
    }

    return saved;
  }

  /*
   * ============================================================
   * REJECT
   * ============================================================
   */

  async reject(
    id: string,
    dto: RejectAssignmentDto,
    actor: UserEntity,
  ): Promise<TaskAssignmentEntity> {
    const assignment =
      await this.findOneOrThrow(
        id,
      );

    /*
     * Once accepted, the User cannot simply reject.
     *
     * Creator/Admin must use Reassign instead.
     */
    if (
      assignment.status !==
      AssignmentStatus.PENDING_ACCEPTANCE
    ) {
      throw new ConflictException(
        appError('ACCEPTED_ASSIGNMENT_CANNOT_REJECTED_DIRECTLY_ASK_ADMIN_TASK_CREATOR_REASSIGN_TASK', 'An accepted Assignment cannot be rejected directly; ask an Admin or the Task creator to reassign the Task'),
      );
    }

    if (
      assignment.assigneeId !==
        actor.id &&
      actor.role.name !==
        RoleName.ADMIN
    ) {
      throw new ForbiddenException(
        appError('ONLY_ASSIGNED_USER_MAY_REJECT_ASSIGNMENT', 'Only the assigned User may reject this Assignment'),
      );
    }

    assignment.status =
      AssignmentStatus.REJECTED;

    assignment.rejectionReason =
      dto.reason;

    assignment.rejectedAt =
      new Date();

    const saved =
      await this.assignmentRepo.save(
        assignment,
      );

    const task =
      await this.taskRepo.findOne({
        where: {
          id:
            assignment.taskId,
        },
      });

    if (task) {
      /*
       * No current assignee after rejection.
       */
      (
        task as any
      ).assignedToId =
        null;

      task.status =
        TaskStatus.UNASSIGNED;

      await this.taskRepo.save(
        task,
      );
    }

    await this.auditLogsService.record({
      actorId:
        actor.id,

      entityType:
        'TaskAssignment',

      entityId:
        saved.id,

      action:
        AuditAction.REJECT,

      reason:
        dto.reason,

      newValue: {
        status:
          saved.status,
      },
    });

    if (task) {
      await this.notificationsService.dispatch({
        recipientId:
          task.createdById,

        type:
          NotificationType.ASSIGNMENT_REJECTED,

        title:
          'Assignment rejected',

        message:
          `${actor.fullName} rejected the assignment for "${task.title}".${formatTaskDetails(task)} Reason: ${dto.reason}`,

        metadata: {
          taskId:
            task.id,

          assignmentId:
            saved.id,

          actorName:
            actor.fullName,

          taskTitle:
            task.title,

          reason:
            dto.reason,
        },
      });
    }

    return saved;
  }

  /*
   * ============================================================
   * REASSIGN
   *
   * Previous assignment is NEVER deleted.
   *
   * Previous:
   * Accepted / Rejected / PendingAcceptance
   *      ↓
   * Reassigned
   *
   * New:
   * PendingAcceptance
   * ============================================================
   */

 async reassign(
  id: string,
  dto: ReassignAssignmentDto,
  actor: UserEntity,
): Promise<TaskAssignmentEntity> {
  const previous =
    await this.findOneOrThrow(
      id,
    );

  const task =
    await this.taskRepo.findOne({
      where: {
        id:
          previous.taskId,
      },
    });

  if (!task) {
    throw new NotFoundException(
      appError('TASK_NOT_FOUND', 'Task not found'),
    );
  }

  if (
    task.archivedAt ||
    task.status ===
      TaskStatus.ARCHIVED
  ) {
    throw new BadRequestException(
      appError('CANNOT_REASSIGN_ARCHIVED_TASK', 'Cannot reassign an archived Task'),
    );
  }

  /*
   * Only Admin or Task creator can perform the reassignment.
   */
  if (
    actor.role.name !==
      RoleName.ADMIN &&
    task.createdById !==
      actor.id
  ) {
    throw new ForbiddenException(
      appError('ONLY_ADMIN_TASK_CREATOR_MAY_REASSIGN_ASSIGNMENT', 'Only an Admin or the Task creator may reassign this Assignment'),
    );
  }

  /*
   * =========================================================
   * REASSIGNMENT RULE
   * =========================================================
   *
   * Reassignment is allowed only when:
   *
   * 1. The previous assignee rejected it.
   *
   * OR
   *
   * 2. The assignment is still PendingAcceptance after
   *    14 full days without a response.
   *
   * Accepted assignments cannot be reassigned.
   */
  const REASSIGN_AFTER_DAYS =
    14;

  const now =
    new Date();

  const createdAt =
    new Date(
      previous.createdAt,
    );

  const ageInMilliseconds =
    now.getTime() -
    createdAt.getTime();

  const ageInDays =
    ageInMilliseconds /
    (
      1000 *
      60 *
      60 *
      24
    );

  const wasRejected =
    previous.status ===
    AssignmentStatus.REJECTED;

  const hasTimedOut =
    previous.status ===
      AssignmentStatus.PENDING_ACCEPTANCE &&
    ageInDays >=
      REASSIGN_AFTER_DAYS;

  if (
    !wasRejected &&
    !hasTimedOut
  ) {
    if (
      previous.status ===
      AssignmentStatus.ACCEPTED
    ) {
      throw new ConflictException(
        appError('ACCEPTED_ASSIGNMENT_CANNOT_REASSIGNED', 'An accepted Assignment cannot be reassigned'),
      );
    }

    if (
      previous.status ===
      AssignmentStatus.PENDING_ACCEPTANCE
    ) {
      const remainingDays =
        Math.max(
          1,
          Math.ceil(
            REASSIGN_AFTER_DAYS -
              ageInDays,
          ),
        );

      throw new ConflictException(
        appError('TASK_ASSIGNMENTS_BUSINESS_RULE_VIOLATION', `This Assignment is still waiting for a response. It can be reassigned after ${REASSIGN_AFTER_DAYS} days. ${remainingDays} day(s) remaining.`),
      );
    }

    throw new ConflictException(
      appError('ASSIGNMENT_NOT_ELIGIBLE_REASSIGNMENT', 'This Assignment is not eligible for reassignment'),
    );
  }

  /*
   * =========================================================
   * NEW ASSIGNEE
   * =========================================================
   */

  const newAssignee =
    await this.getValidAssignee(
      dto.newAssigneeId,
    );

  if (
    newAssignee.id ===
    previous.assigneeId
  ) {
    throw new BadRequestException(
      appError('CHOOSE_DIFFERENT_USER_REASSIGNMENT', 'Choose a different User for reassignment'),
    );
  }

  if (
    dto.dueDate &&
    task.deadlineDate &&
    dto.dueDate >
      task.deadlineDate
  ) {
    throw new BadRequestException(
      appError('ASSIGNMENT_DUE_DATE_CANNOT_EXCEED_PARENT_TASK_S_DUE_DATE', "Assignment due date cannot exceed the parent Task's due date"),
    );
  }

  /*
   * =========================================================
   * CLOSE PREVIOUS ASSIGNMENT
   * =========================================================
   *
   * Keep the previous record so the history remains intact.
   */

  previous.status =
    AssignmentStatus.REASSIGNED;

  await this.assignmentRepo.save(
    previous,
  );

  /*
   * =========================================================
   * CREATE NEW ASSIGNMENT
   * =========================================================
   */

  const newAssignment =
    await this.assignmentRepo.save(
      this.assignmentRepo.create({
        taskId:
          previous.taskId,

        assigneeId:
          newAssignee.id,

        assignedById:
          actor.id,

        dueDate:
          dto.dueDate,

        status:
          AssignmentStatus.PENDING_ACCEPTANCE,
      }),
    );

  /*
   * Keep Task.assignedToId synchronized with the current
   * assignment.
   */
  task.assignedToId =
    newAssignee.id;

  /*
   * The new User still needs to accept.
   */
  if (
    task.status ===
      TaskStatus.UNASSIGNED
  ) {
    task.status =
      TaskStatus.PENDING;
  }

  await this.taskRepo.save(
    task,
  );

  /*
   * =========================================================
   * AUDIT
   * =========================================================
   */

  await this.auditLogsService.record({
    actorId:
      actor.id,

    entityType:
      'TaskAssignment',

    entityId:
      newAssignment.id,

    action:
      AuditAction.REASSIGN,

    oldValue: {
      previousAssignmentId:
        previous.id,

      previousAssigneeId:
        previous.assigneeId,

      reassignmentReason:
        wasRejected
          ? 'Previous assignment rejected'
          : `No response for ${REASSIGN_AFTER_DAYS} days`,
    },

    newValue:
      newAssignment,
  });

  /*
   * =========================================================
   * NOTIFICATION
   * =========================================================
   */

  await this.notificationsService.dispatch({
    recipientId:
      newAssignee.id,

    type:
      NotificationType.TASK_REASSIGNED,

    title:
      'Task reassigned to you',

    message:
      `${actor.fullName} reassigned "${task.title}" to you.${formatTaskDetails(task)}`,

    metadata: {
      taskId:
        task.id,

      assignmentId:
        newAssignment.id,

      actorName:
        actor.fullName,

      taskTitle:
        task.title,

      priority:
        task.priority,

      dueDate:
        task.deadlineDate,
    },
  });

  return newAssignment;
}
}
