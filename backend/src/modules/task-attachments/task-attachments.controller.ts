import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { existsSync } from 'fs';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UserEntity } from '../users/entities/user.entity';
import { TaskAttachmentsService } from './task-attachments.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

// Max files accepted in a single multi-upload request.
const MAX_FILES_PER_UPLOAD = 10;

@ApiTags('attachments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class TaskAttachmentsController {
  constructor(private readonly attachmentsService: TaskAttachmentsService) {}

  // POST /tasks/:taskId/attachments — BR-065, BR-066
  // Accepts one or more files under the "files" field.
  @Post('tasks/:taskId/attachments')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', MAX_FILES_PER_UPLOAD))
  uploadToTask(
    @Param('taskId') taskId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: UserEntity,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one file is required');
    }
    return this.attachmentsService.uploadManyToTask(taskId, files, user);
  }

  // POST /assignments/:id/attachments — BR-065
  // Accepts one or more files under the "files" field.
  @Post('assignments/:id/attachments')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', MAX_FILES_PER_UPLOAD))
  uploadToAssignment(
    @Param('id') assignmentId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: UserEntity,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one file is required');
    }
    return this.attachmentsService.uploadManyToAssignment(assignmentId, files, user);
  }

  // GET /attachments/:id — download
  @Get('attachments/:id')
  async download(@Param('id') id: string, @Res() res: Response) {
    const attachment = await this.attachmentsService.findOne(id);
    const path = `.${attachment.fileUrl}`;
    if (attachment.deletedAt || !existsSync(path)) {
      throw new NotFoundException('Attachment not found');
    }
    return res.download(path, attachment.fileName);
  }

  // DELETE /attachments/:id — BR-067, BR-068
  @Delete('attachments/:id')
  remove(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    return this.attachmentsService.remove(id, user);
  }
}
