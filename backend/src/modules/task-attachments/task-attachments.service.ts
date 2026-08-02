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
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.archivedAt) {
      throw new BadRequestException('Cannot add attachments to an archived Task'); // BR-068
    }

    return this.save({ taskId, file, actor });
  }

  async uploadToAssignment(
    assignmentId: string,
    file: Express.Multer.File,
    actor: UserEntity,
  ): Promise<TaskAttachmentEntity> {
    const assignment = await this.assignmentRepo.findOne({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');

    return this.save({ assignmentId, file, actor });
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
      relations: ['task', 'assignment'],
    });
    if (!attachment) throw new NotFoundException('Attachment not found');
    return attachment;
  }

  // BR-067: only uploader or Admin may delete. BR-068: cannot delete if
  // the parent Task/Assignment is archived.
  async remove(id: string, actor: UserEntity): Promise<void> {
    const attachment = await this.findOne(id);

    const isUploader = attachment.uploadedById === actor.id;
    const isAdmin = actor.role.name === RoleName.ADMIN;
    if (!isUploader && !isAdmin) {
      throw new ForbiddenException('Only the uploader or Admin may delete this Attachment');
    }

    if (attachment.task?.archivedAt) {
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
