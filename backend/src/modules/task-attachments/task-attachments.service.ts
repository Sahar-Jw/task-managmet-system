import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  InjectRepository,
} from '@nestjs/typeorm';

import {
  Repository,
} from 'typeorm';

import {
  unlink,
  writeFile,
} from 'fs/promises';

import {
  join,
} from 'path';

import {
  TaskAttachmentEntity,
} from './entities/task-attachment.entity';

import {
  TaskEntity,
} from '../tasks/entities/task.entity';

import {
  TaskAssignmentEntity,
} from '../task-assignments/entities/task-assignment.entity';

import {
  UserEntity,
} from '../users/entities/user.entity';

import {
  AuditLogsService,
} from '../audit-logs/audit-logs.service';

import {
  AuditAction,
} from '../../shared/enums/audit-action.enum';

import {
  RoleName,
} from '../../shared/enums/role.enum';

import {
  AttachmentStorageType,
} from '../../shared/enums/attachment-storage-type.enum';

import {
  generateStoredFileName,
  getStorageDirectory,
  storedFileUrl,
  storagePathFromUrl,
} from '../../common/storage/storage.util';


@Injectable()
export class TaskAttachmentsService {
  constructor(
    @InjectRepository(
      TaskAttachmentEntity,
    )
    private readonly attachmentRepo:
      Repository<TaskAttachmentEntity>,


    @InjectRepository(
      TaskEntity,
    )
    private readonly taskRepo:
      Repository<TaskEntity>,


    @InjectRepository(
      TaskAssignmentEntity,
    )
    private readonly assignmentRepo:
      Repository<TaskAssignmentEntity>,


    private readonly auditLogsService:
      AuditLogsService,
  ) {}


  /*
   * ==========================================================
   * TASK UPLOAD
   * ==========================================================
   */

  async uploadToTask(
    taskId:
      string,

    file:
      Express.Multer.File,

    actor:
      UserEntity,
  ): Promise<TaskAttachmentEntity> {
    const [
      attachment,
    ] =
      await this.uploadManyToTask(
        taskId,
        [
          file,
        ],
        actor,
      );


    return attachment;
  }


  async uploadManyToTask(
    taskId:
      string,

    files:
      Express.Multer.File[],

    actor:
      UserEntity,
  ): Promise<TaskAttachmentEntity[]> {
    const task =
      await this.taskRepo.findOne({
        where: {
          id:
            taskId,
        },
      });


    if (
      !task
    ) {
      throw new NotFoundException(
        'Task not found',
      );
    }


    if (
      task.archivedAt
    ) {
      throw new BadRequestException(
        'Cannot add attachments to an archived Task',
      );
    }


    this.assertCanUpload(
      task,
      actor,
    );


    const attachments:
      TaskAttachmentEntity[] =
      [];


    for (
      const file
      of files
    ) {
      attachments.push(
        await this.save({
          taskId,
          file,
          actor,
        }),
      );
    }


    return attachments;
  }


  /*
   * ==========================================================
   * ASSIGNMENT UPLOAD
   * ==========================================================
   */

  async uploadToAssignment(
    assignmentId:
      string,

    file:
      Express.Multer.File,

    actor:
      UserEntity,
  ): Promise<TaskAttachmentEntity> {
    const [
      attachment,
    ] =
      await this.uploadManyToAssignment(
        assignmentId,
        [
          file,
        ],
        actor,
      );


    return attachment;
  }


  async uploadManyToAssignment(
    assignmentId:
      string,

    files:
      Express.Multer.File[],

    actor:
      UserEntity,
  ): Promise<TaskAttachmentEntity[]> {
    const assignment =
      await this.assignmentRepo.findOne({
        where: {
          id:
            assignmentId,
        },

        relations: [
          'task',
        ],
      });


    if (
      !assignment
    ) {
      throw new NotFoundException(
        'Assignment not found',
      );
    }


    if (
      assignment.task.archivedAt
    ) {
      throw new BadRequestException(
        'Cannot add attachments to an archived Task',
      );
    }


    this.assertCanUpload(
      assignment.task,
      actor,
    );


    const attachments:
      TaskAttachmentEntity[] =
      [];


    for (
      const file
      of files
    ) {
      attachments.push(
        await this.save({
          assignmentId,
          file,
          actor,
        }),
      );
    }


    return attachments;
  }


  /*
   * ==========================================================
   * UPLOAD PERMISSION
   * ==========================================================
   */

  private assertCanUpload(
    task:
      TaskEntity,

    actor:
      UserEntity,
  ): void {
    const isAdmin =
      actor.role.name ===
      RoleName.ADMIN;


    if (
      !isAdmin &&
      task.createdById !==
        actor.id
    ) {
      throw new ForbiddenException(
        'Only the Task creator or Admin may add attachments',
      );
    }
  }


  /*
   * ==========================================================
   * SAVE
   * ==========================================================
   *
   * IMAGE
   * -----
   *
   * Save image under:
   *
   * backend/storage/attachments/YYYY/MM/
   *
   * DB:
   *
   * file_url = /storage/attachments/YYYY/MM/file.jpg
   * file_data = NULL
   *
   *
   * NON-IMAGE
   * ---------
   *
   * Do not write to disk.
   *
   * DB:
   *
   * file_url = NULL
   * file_data = actual bytes
   * ==========================================================
   */

  private async save(
    params: {
      taskId?:
        string;

      assignmentId?:
        string;

      file:
        Express.Multer.File;

      actor:
        UserEntity;
    },
  ): Promise<TaskAttachmentEntity> {
    const {
      file,
    } =
      params;


    if (
      !file.buffer
    ) {
      throw new BadRequestException(
        'Uploaded file data is missing',
      );
    }


    const isImage =
      file.mimetype.startsWith(
        'image/',
      );


    let imagePath:
      string | null =
      null;


    try {
      /*
       * ======================================================
       * IMAGE
       * ======================================================
       */
      if (
        isImage
      ) {
        const directory =
          getStorageDirectory(
            'attachments',
          );


        const storedName =
          generateStoredFileName(
            file.originalname,
          );


        imagePath =
          join(
            directory,
            storedName,
          );


        await writeFile(
          imagePath,
          file.buffer,
        );


        const entity =
          this.attachmentRepo.create({
            taskId:
              params.taskId,

            assignmentId:
              params.assignmentId,

            uploadedById:
              params.actor.id,

            fileName:
              file.originalname,

            mimeType:
              file.mimetype,

            fileSize:
              file.size,

            storageType:
              AttachmentStorageType.IMAGE,

            fileUrl:
              storedFileUrl(
                imagePath,
              ),

            fileData:
              null,
          });


        const saved =
          await this.attachmentRepo.save(
            entity,
          );


        await this.recordUpload(
          saved,
          params.actor,
        );


        return saved;
      }


      /*
       * ======================================================
       * DATABASE DOCUMENT
       * ======================================================
       */

      const entity =
        this.attachmentRepo.create({
          taskId:
            params.taskId,

          assignmentId:
            params.assignmentId,

          uploadedById:
            params.actor.id,

          fileName:
            file.originalname,

          mimeType:
            file.mimetype,

          fileSize:
            file.size,

          storageType:
            AttachmentStorageType.DATABASE,

          fileUrl:
            null,

          fileData:
            file.buffer,
        });


      const saved =
        await this.attachmentRepo.save(
          entity,
        );


      /*
       * Never return binary data in normal API responses.
       */
      saved.fileData =
        undefined;


      await this.recordUpload(
        saved,
        params.actor,
      );


      return saved;
    } catch (
      error
    ) {
      /*
       * If an image was physically written but the DB insert failed,
       * don't leave an orphan file behind.
       */
      if (
        imagePath
      ) {
        await unlink(
          imagePath,
        ).catch(
          () =>
            undefined,
        );
      }


      throw error;
    }
  }


  /*
   * ==========================================================
   * AUDIT
   * ==========================================================
   *
   * Never write the BLOB into audit_logs.
   * ==========================================================
   */

  private async recordUpload(
    attachment:
      TaskAttachmentEntity,

    actor:
      UserEntity,
  ) {
    await this.auditLogsService.record({
      actorId:
        actor.id,

      entityType:
        'TaskAttachment',

      entityId:
        attachment.id,

      action:
        AuditAction.CREATE,

      newValue: {
        taskId:
          attachment.taskId,

        assignmentId:
          attachment.assignmentId,

        uploadedById:
          attachment.uploadedById,

        fileName:
          attachment.fileName,

        fileUrl:
          attachment.fileUrl,

        mimeType:
          attachment.mimeType,

        fileSize:
          attachment.fileSize,

        storageType:
          attachment.storageType,
      },

      reason:
        attachment.storageType ===
        AttachmentStorageType.IMAGE
          ? 'Image attachment uploaded'
          : 'Document attachment uploaded to database',
    });
  }


  /*
   * ==========================================================
   * FIND ONE
   * ==========================================================
   *
   * includeData=false:
   *
   * normal metadata query.
   *
   * includeData=true:
   *
   * explicitly selects file_data for the download endpoint.
   * ==========================================================
   */

  async findOne(
    id:
      string,

    includeData =
      false,
  ): Promise<TaskAttachmentEntity> {
    const qb =
      this.attachmentRepo
        .createQueryBuilder(
          'attachment',
        )
        .leftJoinAndSelect(
          'attachment.task',
          'task',
        )
        .leftJoinAndSelect(
          'attachment.assignment',
          'assignment',
        )
        .leftJoinAndSelect(
          'assignment.task',
          'assignmentTask',
        )
        .where(
          'attachment.id = :id',
          {
            id,
          },
        );


    if (
      includeData
    ) {
      qb.addSelect(
        'attachment.fileData',
      );
    }


    const attachment =
      await qb.getOne();


    if (
      !attachment
    ) {
      throw new NotFoundException(
        'Attachment not found',
      );
    }


    return attachment;
  }


  /*
   * ==========================================================
   * OWNING TASK
   * ==========================================================
   */

  private owningTask(
    attachment:
      TaskAttachmentEntity,
  ):
    | TaskEntity
    | undefined {
    return (
      attachment.task ??
      attachment.assignment?.task
    );
  }


  /*
   * ==========================================================
   * ASSIGNEE CHECK
   * ==========================================================
   */

  private async isAssigneeOf(
    task:
      TaskEntity,

    actor:
      UserEntity,
  ): Promise<boolean> {
    if (
      task.assignedToId ===
      actor.id
    ) {
      return true;
    }


    return this.assignmentRepo.exist({
      where: {
        taskId:
          task.id,

        assigneeId:
          actor.id,
      },
    });
  }


  /*
   * ==========================================================
   * ACCESS
   * ==========================================================
   */

  async assertCanAccess(
    attachment:
      TaskAttachmentEntity,

    actor:
      UserEntity,

    download:
      boolean,
  ): Promise<void> {
    const task =
      this.owningTask(
        attachment,
      );


    const isAdmin =
      actor.role.name ===
      RoleName.ADMIN;


    const isCreator =
      Boolean(
        task &&
        task.createdById ===
          actor.id,
      );


    if (
      isAdmin ||
      isCreator
    ) {
      return;
    }


    const isAssignee =
      Boolean(
        task &&
        await this.isAssigneeOf(
          task,
          actor,
        ),
      );


    if (
      !isAssignee
    ) {
      throw new ForbiddenException(
        'You do not have access to this Attachment',
      );
    }


    if (
      download &&
      !task!.assigneeCanDownloadAttachments
    ) {
      throw new ForbiddenException(
        'The Task creator has disabled attachment downloads for assignees',
      );
    }
  }


  /*
   * ==========================================================
   * DELETE
   * ==========================================================
   */

  async remove(
    id:
      string,

    actor:
      UserEntity,
  ): Promise<void> {
    const attachment =
      await this.findOne(
        id,
      );


    const task =
      this.owningTask(
        attachment,
      );


    const isAdmin =
      actor.role.name ===
      RoleName.ADMIN;


    const isCreator =
      Boolean(
        task &&
        task.createdById ===
          actor.id,
      );


    if (
      !isAdmin &&
      !isCreator
    ) {
      throw new ForbiddenException(
        'Only the Task creator or Admin may delete this Attachment',
      );
    }


    if (
      task?.archivedAt
    ) {
      throw new BadRequestException(
        'Cannot delete an Attachment on an archived Task',
      );
    }


    /*
     * Soft-delete DB record.
     */
    attachment.deletedAt =
      new Date();


    await this.attachmentRepo.save(
      attachment,
    );


    /*
     * Only images have physical files.
     */
    if (
      attachment.storageType ===
        AttachmentStorageType.IMAGE &&
      attachment.fileUrl
    ) {
      const physicalPath =
        storagePathFromUrl(
          attachment.fileUrl,
        );


      if (
        physicalPath
      ) {
        await unlink(
          physicalPath,
        ).catch(
          () =>
            undefined,
        );
      }
    }


    await this.auditLogsService.record({
      actorId:
        actor.id,

      entityType:
        'TaskAttachment',

      entityId:
        attachment.id,

      action:
        AuditAction.DELETE,

      newValue: {
        fileName:
          attachment.fileName,

        storageType:
          attachment.storageType,
      },

      reason:
        'Attachment deleted',
    });
  }
}