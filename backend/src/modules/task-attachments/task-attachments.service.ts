import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { unlink } from 'fs/promises';
import { TaskAttachmentEntity } from './entities/task-attachment.entity';
import { TaskEntity } from '../tasks/entities/task.entity';
import { TaskAssignmentEntity } from '../task-assignments/entities/task-assignment.entity';
import { UserEntity } from '../users/entities/user.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../../shared/enums/audit-action.enum';
import { RoleName } from '../../shared/enums/role.enum';

@Injectable()
export class TaskAttachmentsService {
  constructor(
    @InjectRepository(TaskAttachmentEntity)
    private readonly attachmentRepo: Repository<TaskAttachmentEntity>,
    @InjectRepository(TaskEntity)
    private readonly taskRepo: Repository<TaskEntity>,
    @InjectRepository(TaskAssignmentEntity)
    private readonly assignmentRepo: Repository<TaskAssignmentEntity>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // BR-065: attachment belongs to exactly one of Task/Assignment.
  async uploadToTask(taskId: string, file: Express.Multer.File, actor: UserEntity): Promise<TaskAttachmentEntity> {
    const [attachment] = await this.uploadManyToTask(taskId, [file], actor);
    return attachment;
  }

  // Validates the parent Task once, then saves every file. Kept as a single
  // DB round-trip for the parent lookup instead of re-checking per file.
  async uploadManyToTask(
    taskId: string,
    files: Express.Multer.File[],
    actor: UserEntity,
  ): Promise<TaskAttachmentEntity[]> {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.archivedAt) {
      throw new BadRequestException('Cannot add attachments to an archived Task'); // BR-068
    }
    this.assertCanUpload(task, actor); // BR-071: only the Task creator or Admin may add attachments

    const attachments: TaskAttachmentEntity[] = [];
    for (const file of files) {
      attachments.push(await this.save({ taskId, file, actor }));
    }
    return attachments;
  }

  async uploadToAssignment(
    assignmentId: string,
    file: Express.Multer.File,
    actor: UserEntity,
  ): Promise<TaskAttachmentEntity> {
    const [attachment] = await this.uploadManyToAssignment(assignmentId, [file], actor);
    return attachment;
  }

  async uploadManyToAssignment(
    assignmentId: string,
    files: Express.Multer.File[],
    actor: UserEntity,
  ): Promise<TaskAttachmentEntity[]> {
    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId },
      relations: ['task'],
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    this.assertCanUpload(assignment.task, actor); // BR-071: only the Task creator or Admin may add attachments

    const attachments: TaskAttachmentEntity[] = [];
    for (const file of files) {
      attachments.push(await this.save({ assignmentId, file, actor }));
    }
    return attachments;
  }

  // BR-071: only the Task creator (owner) or Admin may add attachments —
  // not the assignee, regardless of which endpoint (Task or Assignment).
  private assertCanUpload(task: TaskEntity, actor: UserEntity): void {
    const isAdmin = actor.role.name === RoleName.ADMIN;
    if (!isAdmin && task.createdById !== actor.id) {
      throw new ForbiddenException('Only the Task creator or Admin may add attachments');
    }
  }

  private async save(params: {
    taskId?: string;
    assignmentId?: string;
    file: Express.Multer.File;
    actor: UserEntity;
  }): Promise<TaskAttachmentEntity> {
    const attachment = await this.attachmentRepo.save(
      this.attachmentRepo.create({
        taskId: params.taskId,
        assignmentId: params.assignmentId,
        uploadedById: params.actor.id,
        fileName: params.file.originalname,
        fileUrl: `/uploads/${params.file.filename}`,
        mimeType: params.file.mimetype,
        fileSize: params.file.size,
      }),
    );

    // BR-069: every upload is logged with uploader, timestamp, metadata, entity.
    await this.auditLogsService.record({
      actorId: params.actor.id,
      entityType: 'TaskAttachment',
      entityId: attachment.id,
      action: AuditAction.CREATE,
      newValue: attachment,
    });

    return attachment;
  }

  async findOne(id: string): Promise<TaskAttachmentEntity> {
    const attachment = await this.attachmentRepo.findOne({
      where: { id },
      relations: ['task', 'assignment', 'assignment.task'],
    });
    if (!attachment) throw new NotFoundException('Attachment not found');
    return attachment;
  }

  // The Task that owns this attachment, whether it hangs off the Task
  // directly or off one of its Assignments (BR-065).
  private owningTask(attachment: TaskAttachmentEntity): TaskEntity | undefined {
    return attachment.task ?? attachment.assignment?.task;
  }

  private async isAssigneeOf(task: TaskEntity, actor: UserEntity): Promise<boolean> {
    if (task.assignedToId === actor.id) return true;
    return this.assignmentRepo.exist({ where: { taskId: task.id, assigneeId: actor.id } });
  }

  // BR-072: preview is always allowed for the Task creator, Admin, and the
  // assigned User(s) — it is never gated by the download-permission toggle.
  // BR-070: download additionally requires the creator's/Admin's toggle
  // (`assigneeCanDownloadAttachments`) when the requester is only an assignee.
  async assertCanAccess(attachment: TaskAttachmentEntity, actor: UserEntity, download: boolean): Promise<void> {
    const task = this.owningTask(attachment);
    const isAdmin = actor.role.name === RoleName.ADMIN;
    const isCreator = !!task && task.createdById === actor.id;

    if (isAdmin || isCreator) return;

    const isAssignee = !!task && (await this.isAssigneeOf(task, actor));
    if (!isAssignee) {
      throw new ForbiddenException('You do not have access to this Attachment');
    }
    if (download && !task!.assigneeCanDownloadAttachments) {
      throw new ForbiddenException('The Task creator has disabled attachment downloads for assignees');
    }
  }

  // BR-071: only the Task creator (owner) or Admin may delete an Attachment.
  // BR-068: cannot delete if the parent Task is archived.
  async remove(id: string, actor: UserEntity): Promise<void> {
    const attachment = await this.findOne(id);

    const task = this.owningTask(attachment);
    const isAdmin = actor.role.name === RoleName.ADMIN;
    const isCreator = !!task && task.createdById === actor.id;
    if (!isAdmin && !isCreator) {
      throw new ForbiddenException('Only the Task creator or Admin may delete this Attachment');
    }

    if (task?.archivedAt) {
      throw new BadRequestException('Cannot delete an Attachment on an archived Task');
    }

    attachment.deletedAt = new Date();
    await this.attachmentRepo.save(attachment);

    try {
      await unlink(`.${attachment.fileUrl}`);
    } catch {
      // File may already be missing from disk; the DB soft-delete is authoritative.
    }

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'TaskAttachment',
      entityId: attachment.id,
      action: AuditAction.DELETE,
    });
  }
}
