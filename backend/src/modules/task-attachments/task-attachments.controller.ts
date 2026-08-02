import {
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { existsSync } from 'fs';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UserEntity } from '../users/entities/user.entity';
import { TaskAttachmentsService } from './task-attachments.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('attachments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class TaskAttachmentsController {
  constructor(private readonly attachmentsService: TaskAttachmentsService) {}

  // POST /tasks/:taskId/attachments — BR-065, BR-066
  @Post('tasks/:taskId/attachments')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  uploadToTask(
    @Param('taskId') taskId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: UserEntity,
  ) {
    return this.attachmentsService.uploadToTask(taskId, file, user);
  }

  // POST /assignments/:id/attachments — BR-065
  @Post('assignments/:id/attachments')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  uploadToAssignment(
    @Param('id') assignmentId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: UserEntity,
  ) {
    return this.attachmentsService.uploadToAssignment(assignmentId, file, user);
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
