import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TasksService } from '../tasks/tasks.service';
import { TaskEntity } from '../tasks/entities/task.entity';
import { TaskAttachmentEntity } from './entities/task-attachment.entity';
import { TaskCommentEntity } from '../task-comments/entities/task-comment.entity';
import { TaskAssignmentEntity } from '../task-assignments/entities/task-assignment.entity';
import { ProjectEntity } from '../projects/entities/project.entity';
import { SettingEntity } from '../settings/entities/setting.entity';
import { UserEntity } from '../users/entities/user.entity';
import { TaskRatingEntity } from '../task-ratings/entities/task-rating.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ProjectsService } from '../projects/projects.service';
import { TaskWorkflowService } from '../task-workflow/task-workflow.service';

describe('TasksService', () => {
  it('filters out soft-deleted attachments and comments', async () => {
    const task = {
      id: 'task-1',
      attachments: [
        { id: 'a-live', fileName: 'live.pdf', deletedAt: null },
        { id: 'a-deleted', fileName: 'old.pdf', deletedAt: new Date() },
      ],
      comments: [
        { id: 'c-live', content: 'ok', deletedAt: null },
        { id: 'c-deleted', content: 'gone', deletedAt: new Date() },
      ],
    } as unknown as TaskEntity;

    const taskRepo = { findOne: jest.fn().mockResolvedValue(task) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: getRepositoryToken(TaskEntity), useValue: taskRepo },
        { provide: getRepositoryToken(ProjectEntity), useValue: {} },
        { provide: getRepositoryToken(SettingEntity), useValue: {} },
        { provide: getRepositoryToken(UserEntity), useValue: {} },
        { provide: getRepositoryToken(TaskAssignmentEntity), useValue: {} },
        { provide: getRepositoryToken(TaskCommentEntity), useValue: {} },
        { provide: getRepositoryToken(TaskAttachmentEntity), useValue: {} },
        { provide: getRepositoryToken(TaskRatingEntity), useValue: {} },
        { provide: AuditLogsService, useValue: { record: jest.fn() } },
        { provide: ProjectsService, useValue: {} },
        { provide: TaskWorkflowService, useValue: {} },
      ],
    }).compile();

    const service = moduleRef.get(TasksService);
    const result = await service.findOne('task-1');

    expect(result.attachments.map((a) => a.id)).toEqual(['a-live']);
    expect(result.comments.map((c) => c.id)).toEqual(['c-live']);
  });

  it('updates the attachment permission by toggling the boolean field directly', async () => {
    const task = {
      id: 'task-1',
      createdById: 'user-1',
      assigneeCanDownloadAttachments: true,
      attachments: [],
      comments: [],
    } as unknown as TaskEntity;

    const taskRepo = {
      findOne: jest.fn().mockResolvedValue({ ...task, assigneeCanDownloadAttachments: false }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: getRepositoryToken(TaskEntity), useValue: taskRepo },
        { provide: getRepositoryToken(ProjectEntity), useValue: {} },
        { provide: getRepositoryToken(SettingEntity), useValue: {} },
        { provide: getRepositoryToken(UserEntity), useValue: {} },
        { provide: getRepositoryToken(TaskAssignmentEntity), useValue: {} },
        { provide: getRepositoryToken(TaskCommentEntity), useValue: {} },
        { provide: getRepositoryToken(TaskAttachmentEntity), useValue: {} },
        { provide: getRepositoryToken(TaskRatingEntity), useValue: {} },
        { provide: AuditLogsService, useValue: { record: jest.fn() } },
        { provide: ProjectsService, useValue: {} },
        { provide: TaskWorkflowService, useValue: {} },
      ],
    }).compile();

    const service = moduleRef.get(TasksService);
    const actor = { id: 'user-1', role: { name: 'ADMIN' } } as any;

    const result = await service.updateAttachmentPermissions(
      'task-1',
      { assigneeCanDownloadAttachments: false },
      actor,
    );

    expect(taskRepo.update).toHaveBeenCalledWith('task-1', {
      assigneeCanDownloadAttachments: false,
    });
    expect(result.assigneeCanDownloadAttachments).toBe(false);
  });
});
