import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { TaskCommentEntity } from './entities/task-comment.entity';
import { TaskEntity } from '../tasks/entities/task.entity';
import { TaskAssignmentEntity } from '../task-assignments/entities/task-assignment.entity';
import { UserEntity } from '../users/entities/user.entity';
import { CreateCommentDto, UpdateCommentDto } from './dto/task-comment.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RoleName } from '../../shared/enums/role.enum';
import { AuditAction } from '../../shared/enums/audit-action.enum';
import { NotificationType } from '../../shared/enums/notification-type.enum';

@Injectable()
export class TaskCommentsService {
  constructor(
    @InjectRepository(TaskCommentEntity)
    private readonly commentRepo: Repository<TaskCommentEntity>,
    @InjectRepository(TaskEntity)
    private readonly taskRepo: Repository<TaskEntity>,
    @InjectRepository(TaskAssignmentEntity)
    private readonly assignmentRepo: Repository<TaskAssignmentEntity>,
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findForTask(taskId: string, actor: UserEntity) {
    const task = await this.getTaskAndAssertVisibility(taskId, actor);
    return this.commentRepo.find({
      where: { taskId: task.id, deletedAt: IsNull() },
      relations: ['author'],
      order: { createdAt: 'ASC' },
    });
  }

  // BR-060: visibility = Assignee, creator, Department members, or Admin;
  // not allowed on archived Tasks.
  private async getTaskAndAssertVisibility(taskId: string, actor: UserEntity): Promise<TaskEntity> {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    if (actor.role.name === RoleName.ADMIN) return task;
    if (task.createdById === actor.id) return task;
    if (task.departmentId === actor.departmentId) return task;

    const isAssignee = await this.assignmentRepo.exist({ where: { taskId, assigneeId: actor.id } });
    if (isAssignee) return task;

    throw new ForbiddenException('You do not have visibility into this Task');
  }

  async create(taskId: string, dto: CreateCommentDto, actor: UserEntity): Promise<TaskCommentEntity> {
    const task = await this.getTaskAndAssertVisibility(taskId, actor);

    // BR-063: comments cannot be added to archived (or hard-deleted) Tasks.
    if (task.archivedAt) {
      throw new ForbiddenException('Cannot add comments to an archived Task');
    }

    const comment = await this.commentRepo.save(
      this.commentRepo.create({ taskId: task.id, authorId: actor.id, content: dto.content }),
    );

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'TaskComment',
      entityId: comment.id,
      action: AuditAction.CREATE,
      newValue: comment,
    });

    // BR-070: notify relevant parties on new comment (creator + assignees, excluding the author).
    const notifyTargets = new Set<string>([task.createdById]);
    const assignments = await this.assignmentRepo.find({ where: { taskId: task.id } });
    assignments.forEach((a) => notifyTargets.add(a.assigneeId));
    notifyTargets.delete(actor.id);

    for (const recipientId of notifyTargets) {
      await this.notificationsService.dispatch({
        recipientId,
        type: NotificationType.NEW_COMMENT,
        title: 'New comment on a Task',
        message: `${actor.fullName} commented on "${task.titleEn}".`,
        metadata: { taskId: task.id, commentId: comment.id },
      });
    }

    return comment;
  }

  // BR-061: a User cannot edit another User's comment. BR-062: edited indicator + timestamp.
  async update(id: string, dto: UpdateCommentDto, actor: UserEntity): Promise<TaskCommentEntity> {
    const comment = await this.findOwnedOrThrow(id, actor, 'edit');
    comment.content = dto.content;
    comment.isEdited = true;
    comment.editedAt = new Date();
    const saved = await this.commentRepo.save(comment);

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'TaskComment',
      entityId: saved.id,
      action: AuditAction.UPDATE,
      newValue: saved,
    });

    return saved;
  }

  // BR-061: Admin may delete (moderate) any comment. BR-064: soft-delete.
  async remove(id: string, actor: UserEntity): Promise<void> {
    const comment = await this.commentRepo.findOne({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');

    const isOwner = comment.authorId === actor.id;
    const isAdmin = actor.role.name === RoleName.ADMIN;
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You may only delete your own comments');
    }

    comment.deletedAt = new Date();
    await this.commentRepo.save(comment);

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'TaskComment',
      entityId: comment.id,
      action: AuditAction.DELETE,
      reason: isAdmin && !isOwner ? 'Moderated by Admin' : undefined,
    });
  }

  private async findOwnedOrThrow(
    id: string,
    actor: UserEntity,
    action: 'edit',
  ): Promise<TaskCommentEntity> {
    const comment = await this.commentRepo.findOne({ where: { id } });
    if (!comment || comment.deletedAt) throw new NotFoundException('Comment not found');
    if (comment.authorId !== actor.id) {
      throw new ForbiddenException(`You may only ${action} your own comments`);
    }
    return comment;
  }
}
