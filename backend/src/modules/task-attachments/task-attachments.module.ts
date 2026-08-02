import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TaskAttachmentEntity } from './entities/task-attachment.entity';
import { TaskEntity } from '../tasks/entities/task.entity';
import { TaskAssignmentEntity } from '../task-assignments/entities/task-assignment.entity';
import { TaskAttachmentsService } from './task-attachments.service';
import { TaskAttachmentsController } from './task-attachments.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { multerConfig } from './multer.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaskAttachmentEntity, TaskEntity, TaskAssignmentEntity]),
    AuditLogsModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        multerConfig(config.get<number>('uploads.maxFileSizeMb') ?? 25),
    }),
  ],
  providers: [TaskAttachmentsService],
  controllers: [TaskAttachmentsController],
  exports: [TaskAttachmentsService],
})
export class TaskAttachmentsModule {}
