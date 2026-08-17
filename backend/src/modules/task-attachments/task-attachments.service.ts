import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { appError } from '../../common/errors/app-error';

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
        appError('TASK_NOT_FOUND', 'Task not found'),
      );
    }


    if (
      task.archivedAt
    ) {
      throw new BadRequestException(
        appError('CANNOT_ADD_ATTACHMENTS_ARCHIVED_TASK', 'Cannot add attachments to an archived Task'),
      );
    }


    this.assertCanUpload(
      task,
      actor,
    );


    if (
      !files ||
      files.length ===
        0
    ) {
      throw new BadRequestException(
        appError('AT_LEAST_ONE_FILE_REQUIRED', 'At least one file is required'),
      );
    }


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
        appError('ASSIGNMENT_NOT_FOUND', 'Assignment not found'),
      );
    }


    if (
      assignment.task.archivedAt
    ) {
      throw new BadRequestException(
        appError('CANNOT_ADD_ATTACHMENTS_ARCHIVED_TASK', 'Cannot add attachments to an archived Task'),
      );
    }


    this.assertCanUpload(
      assignment.task,
      actor,
    );


    if (
      !files ||
      files.length ===
        0
    ) {
      throw new BadRequestException(
        appError('AT_LEAST_ONE_FILE_REQUIRED', 'At least one file is required'),
      );
    }


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
   *
   * Keep the existing behavior:
   *
   * - Task creator may upload
   * - Admin may upload
   *
   * Delete permission is stricter and handled separately.
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


    const isCreator =
      task.createdById ===
      actor.id;


    if (
      !isAdmin &&
      !isCreator
    ) {
      throw new ForbiddenException(
        appError('ONLY_TASK_CREATOR_ADMIN_MAY_ADD_ATTACHMENTS', 'Only the Task creator or Admin may add attachments'),
      );
    }
  }


  /*
   * ==========================================================
   * SAVE
   * ==========================================================
   *
   * IMAGE
   * ==========================================================
   *
   * Multer:
   *
   * memoryStorage()
   *
   * Then:
   *
   * file.buffer
   *     ↓
   * backend/storage/attachments/YYYY/MM/random.ext
   *
   * Database:
   *
   * storage_type = IMAGE
   * file_url      = /storage/attachments/YYYY/MM/random.ext
   * file_data     = NULL
   *
   *
   * DOCUMENT
   * ==========================================================
   *
   * Multer:
   *
   * memoryStorage()
   *
   * Then:
   *
   * file.buffer
   *     ↓
   * MySQL task_attachments.file_data LONGBLOB
   *
   * Database:
   *
   * storage_type = DATABASE
   * file_url      = NULL
   * file_data     = bytes
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


    /*
     * With memoryStorage() this MUST exist.
     */
    if (
      !file.buffer ||
      file.buffer.length ===
        0
    ) {
      throw new BadRequestException(
        appError('UPLOADED_FILE_DATA_MISSING', 'Uploaded file data is missing'),
      );
    }


    const isImage =
      file.mimetype
        .toLowerCase()
        .startsWith(
          'image/',
        );


    let writtenImagePath:
      string | null =
      null;


    try {
      /*
       * ======================================================
       * IMAGE -> STORAGE FOLDER
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


        writtenImagePath =
          join(
            directory,
            storedName,
          );


        /*
         * Write image buffer to:
         *
         * storage/attachments/YYYY/MM/
         */
        await writeFile(
          writtenImagePath,
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
                writtenImagePath,
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
       * NON-IMAGE -> MYSQL
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

          /*
           * Actual PDF/DOCX/XLSX/etc bytes.
           */
          fileData:
            file.buffer,
        });


      const saved =
        await this.attachmentRepo.save(
          entity,
        );


      /*
       * fileData is select:false on the Entity.
       *
       * Also make sure we never accidentally return the newly
       * inserted binary buffer in a normal API response.
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
       * If we wrote an image to disk and then the DB insert
       * failed, remove the orphan image.
       */
      if (
        writtenImagePath
      ) {
        await unlink(
          writtenImagePath,
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
   * AUDIT UPLOAD
   * ==========================================================
   *
   * Never store fileData inside audit_logs.
   * ==========================================================
   */

  private async recordUpload(
    attachment:
      TaskAttachmentEntity,

    actor:
      UserEntity,
  ): Promise<void> {
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
   * Normal API:
   *
   * includeData = false
   *
   * file_data is NOT selected.
   *
   *
   * Preview/download:
   *
   * includeData = true
   *
   * file_data is explicitly selected.
   * ==========================================================
   */

  async findOne(
    id:
      string,

    includeData =
      false,
  ): Promise<TaskAttachmentEntity> {
    const query =
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
      query.addSelect(
        'attachment.fileData',
      );
    }


    const attachment =
      await query.getOne();


    if (
      !attachment ||
      attachment.deletedAt
    ) {
      throw new NotFoundException(
        appError('ATTACHMENT_NOT_FOUND', 'Attachment not found'),
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
    /*
     * Current direct assignee.
     */
    if (
      task.assignedToId ===
      actor.id
    ) {
      return true;
    }


    /*
     * Assignment history/current Assignment records.
     */
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
   * PREVIEW / DOWNLOAD ACCESS
   * ==========================================================
   *
   * OWNER
   * -----
   * Preview: yes
   * Download: yes
   *
   * ADMIN
   * -----
   * Preview: yes
   * Download: yes
   *
   * ASSIGNEE
   * --------
   * Preview: ALWAYS yes
   *
   * Download:
   *
   * task.assigneeCanDownloadAttachments === true
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


    if (
      !task
    ) {
      throw new NotFoundException(
        appError('TASK_ATTACHMENT_NO_LONGER_EXISTS', 'The Task for this Attachment no longer exists'),
      );
    }


    const isAdmin =
      actor.role.name ===
      RoleName.ADMIN;


    const isCreator =
      task.createdById ===
      actor.id;


    /*
     * Owner/Admin always have file access.
     */
    if (
      isAdmin ||
      isCreator
    ) {
      return;
    }


    const isAssignee =
      await this.isAssigneeOf(
        task,
        actor,
      );


    if (
      !isAssignee
    ) {
      throw new ForbiddenException(
        appError('YOU_DO_NOT_HAVE_ACCESS_ATTACHMENT', 'You do not have access to this Attachment'),
      );
    }


    /*
     * ASSIGNEE PREVIEW
     *
     * download === false
     *
     * Always allowed.
     */
    if (
      !download
    ) {
      return;
    }


    /*
     * ASSIGNEE DOWNLOAD
     */
    if (
      !task.assigneeCanDownloadAttachments
    ) {
      throw new ForbiddenException(
        appError('TASK_CREATOR_HAS_DISABLED_ATTACHMENT_DOWNLOADS_ASSIGNEES', 'The Task creator has disabled attachment downloads for assignees'),
      );
    }
  }


  /*
   * ==========================================================
   * DELETE
   * ==========================================================
   *
   * IMPORTANT:
   *
   * ONLY THE TASK OWNER / CREATOR MAY DELETE.
   *
   * Being an Admin by itself is NOT enough.
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


    if (
      !task
    ) {
      throw new NotFoundException(
        appError('TASK_ATTACHMENT_NO_LONGER_EXISTS', 'The Task for this Attachment no longer exists'),
      );
    }


    const isCreator =
      task.createdById ===
      actor.id;


    /*
     * OWNER ONLY.
     */
    if (
      !isCreator
    ) {
      throw new ForbiddenException(
        appError('ONLY_TASK_OWNER_MAY_DELETE_ATTACHMENT', 'Only the Task owner may delete this Attachment'),
      );
    }


    if (
      task.archivedAt
    ) {
      throw new BadRequestException(
        appError('CANNOT_DELETE_ATTACHMENT_ON_ARCHIVED_TASK', 'Cannot delete an Attachment on an archived Task'),
      );
    }


    const oldValue = {
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
    };


    /*
     * ========================================================
     * IMAGE
     * ========================================================
     *
     * Delete physical image.
     * ========================================================
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


    /*
     * ========================================================
     * SOFT DELETE DATABASE ROW
     * ========================================================
     *
     * For DATABASE attachments the blob remains in the soft-
     * deleted row for audit/history consistency.
     *
     * It is no longer accessible through findOne().
     * ========================================================
     */

    attachment.deletedAt =
      new Date();


    await this.attachmentRepo.save(
      attachment,
    );


    await this.auditLogsService.record({
      actorId:
        actor.id,

      entityType:
        'TaskAttachment',

      entityId:
        attachment.id,

      action:
        AuditAction.DELETE,

      oldValue,

      newValue: {
        deletedAt:
          attachment.deletedAt,

        storageType:
          attachment.storageType,
      },

      reason:
        'Attachment deleted by Task owner',
    });
  }
}