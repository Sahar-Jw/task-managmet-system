import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { appError } from '../../common/errors/app-error';

import {
  FilesInterceptor,
} from '@nestjs/platform-express';

import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiTags,
} from '@nestjs/swagger';

import {
  Response,
} from 'express';

import {
  existsSync,
} from 'fs';

import {
  JwtAuthGuard,
} from '../../common/guards/jwt-auth.guard';

import {
  UserEntity,
} from '../users/entities/user.entity';

import {
  TaskAttachmentsService,
} from './task-attachments.service';

import {
  CurrentUser,
} from '../../common/decorators/current-user.decorator';

import {
  AttachmentStorageType,
} from '../../shared/enums/attachment-storage-type.enum';

import {
  storagePathFromUrl,
} from '../../common/storage/storage.util';


const MAX_FILES_PER_UPLOAD =
  10;


@ApiTags(
  'attachments',
)
@ApiBearerAuth()
@UseGuards(
  JwtAuthGuard,
)
@Controller()
export class TaskAttachmentsController {
  constructor(
    private readonly attachmentsService:
      TaskAttachmentsService,
  ) {}


  /*
   * ==========================================================
   * TASK ATTACHMENTS
   * ==========================================================
   */

  @Post(
    'tasks/:taskId/attachments',
  )
  @ApiConsumes(
    'multipart/form-data',
  )
  @ApiBody({
    schema: {
      type:
        'object',

      properties: {
        files: {
          type:
            'array',

          items: {
            type:
              'string',

            format:
              'binary',
          },
        },
      },
    },
  })
  @UseInterceptors(
    FilesInterceptor(
      'files',
      MAX_FILES_PER_UPLOAD,
    ),
  )
  uploadToTask(
    @Param(
      'taskId',
    )
    taskId:
      string,

    @UploadedFiles()
    files:
      Express.Multer.File[],

    @CurrentUser()
    user:
      UserEntity,
  ) {
    if (
      !files ||
      files.length ===
        0
    ) {
      throw new BadRequestException(
        appError('AT_LEAST_ONE_FILE_REQUIRED', 'At least one file is required'),
      );
    }


    return this.attachmentsService
      .uploadManyToTask(
        taskId,
        files,
        user,
      );
  }


  /*
   * ==========================================================
   * ASSIGNMENT ATTACHMENTS
   * ==========================================================
   */

  @Post(
    'assignments/:id/attachments',
  )
  @ApiConsumes(
    'multipart/form-data',
  )
  @ApiBody({
    schema: {
      type:
        'object',

      properties: {
        files: {
          type:
            'array',

          items: {
            type:
              'string',

            format:
              'binary',
          },
        },
      },
    },
  })
  @UseInterceptors(
    FilesInterceptor(
      'files',
      MAX_FILES_PER_UPLOAD,
    ),
  )
  uploadToAssignment(
    @Param(
      'id',
    )
    assignmentId:
      string,

    @UploadedFiles()
    files:
      Express.Multer.File[],

    @CurrentUser()
    user:
      UserEntity,
  ) {
    if (
      !files ||
      files.length ===
        0
    ) {
      throw new BadRequestException(
        appError('AT_LEAST_ONE_FILE_REQUIRED', 'At least one file is required'),
      );
    }


    return this.attachmentsService
      .uploadManyToAssignment(
        assignmentId,
        files,
        user,
      );
  }


  /*
   * ==========================================================
   * PREVIEW / DOWNLOAD
   * ==========================================================
   *
   * IMAGE:
   *
   * read physical image from backend/storage.
   *
   * DATABASE:
   *
   * return LONGBLOB bytes from MySQL.
   * ==========================================================
   */

  @Get(
    'attachments/:id',
  )
  async download(
    @Param(
      'id',
    )
    id:
      string,

    @Query(
      'intent',
    )
    intent:
      string,

    @CurrentUser()
    user:
      UserEntity,

    @Res()
    res:
      Response,
  ) {
    const attachment =
      await this.attachmentsService
        .findOne(
          id,
          true,
        );


    const isDownload =
      intent ===
      'download';


    await this.attachmentsService
      .assertCanAccess(
        attachment,
        user,
        isDownload,
      );


    if (
      attachment.deletedAt
    ) {
      throw new NotFoundException(
        appError('ATTACHMENT_NOT_FOUND', 'Attachment not found'),
      );
    }


    /*
     * ========================================================
     * IMAGE FROM DISK
     * ========================================================
     */

    if (
      attachment.storageType ===
      AttachmentStorageType.IMAGE
    ) {
      if (
        !attachment.fileUrl
      ) {
        throw new NotFoundException(
          appError('ATTACHMENT_IMAGE_PATH_MISSING', 'Attachment image path is missing'),
        );
      }


      const physicalPath =
        storagePathFromUrl(
          attachment.fileUrl,
        );


      if (
        !physicalPath ||
        !existsSync(
          physicalPath,
        )
      ) {
        throw new NotFoundException(
          appError('ATTACHMENT_IMAGE_NOT_FOUND', 'Attachment image not found'),
        );
      }


      res.type(
        attachment.mimeType,
      );


      if (
        isDownload
      ) {
        return res.download(
          physicalPath,
          attachment.fileName,
        );
      }


      /*
       * Browser preview.
       */
      res.setHeader(
        'Content-Disposition',
        this.contentDisposition(
          'inline',
          attachment.fileName,
        ),
      );


      return res.sendFile(
        physicalPath,
      );
    }


    /*
     * ========================================================
     * DOCUMENT FROM MYSQL
     * ========================================================
     */

    if (
      attachment.storageType ===
      AttachmentStorageType.DATABASE
    ) {
      if (
        !attachment.fileData
      ) {
        throw new NotFoundException(
          appError('ATTACHMENT_DATA_NOT_FOUND', 'Attachment data not found'),
        );
      }


      res.setHeader(
        'Content-Type',
        attachment.mimeType ||
          'application/octet-stream',
      );


      res.setHeader(
        'Content-Length',
        String(
          attachment.fileData.length,
        ),
      );


      res.setHeader(
        'Content-Disposition',
        this.contentDisposition(
          isDownload
            ? 'attachment'
            : 'inline',

          attachment.fileName,
        ),
      );


      return res.send(
        attachment.fileData,
      );
    }


    throw new NotFoundException(
      appError('UNKNOWN_ATTACHMENT_STORAGE_TYPE', 'Unknown attachment storage type'),
    );
  }


  /*
   * ==========================================================
   * DELETE
   * ==========================================================
   */

  @Delete(
    'attachments/:id',
  )
  remove(
    @Param(
      'id',
    )
    id:
      string,

    @CurrentUser()
    user:
      UserEntity,
  ) {
    return this.attachmentsService
      .remove(
        id,
        user,
      );
  }


  /*
   * ==========================================================
   * CONTENT DISPOSITION
   * ==========================================================
   */

  private contentDisposition(
    type:
      'inline' |
      'attachment',

    fileName:
      string,
  ): string {
    const safeAsciiName =
      fileName
        .replace(
          /[\r\n"]/g,
          '_',
        );


    const encodedName =
      encodeURIComponent(
        fileName,
      );


    return `${type}; filename="${safeAsciiName}"; filename*=UTF-8''${encodedName}`;
  }
}