import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { TaskEntity } from './entities/task.entity';
import { TaskAttachmentEntity } from '../task-attachments/entities/task-attachment.entity';
import { TaskAttachmentsService } from '../task-attachments/task-attachments.service';
import { TaskCommentEntity } from '../task-comments/entities/task-comment.entity';
import { TaskAssignmentEntity } from '../task-assignments/entities/task-assignment.entity';
import { TaskAssignmentsService } from '../task-assignments/task-assignments.service';
import { ProjectEntity } from '../projects/entities/project.entity';
import { SettingEntity } from '../settings/entities/setting.entity';
import { UserEntity } from '../users/entities/user.entity';
import { TaskRatingEntity } from '../task-ratings/entities/task-rating.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ProjectsService } from '../projects/projects.service';
import { TaskWorkflowService } from '../task-workflow/task-workflow.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';
import { assertTaskApprovalAllowsWork } from '../../shared/utils/task-approval.util';

const admin = { id: 'admin-1', fullName: 'Admin', role: { name: 'ADMIN' } } as any;
const creator = { id: 'creator-1', fullName: 'Creator', role: { name: 'USER' } } as any;
const approver = { id: 'approver-1', fullName: 'Approver', role: { name: 'USER' } } as any;
const stranger = { id: 'stranger-1', fullName: 'Stranger', role: { name: 'USER' } } as any;

function baseTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task-1',
    title: 'T',
    priority: 'Medium',
    status: 'Pending',
    createdById: 'creator-1',
    needsApproval: true,
    approverId: 'approver-1',
    approvalStatus: 'Pending',
    assignments: [],
    attachments: [],
    comments: [],
    ...overrides,
  };
}

async function buildTasksService(task: any) {
  const taskRepo = {
    findOne: jest.fn().mockResolvedValue(task),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    save: jest.fn(async (t) => t),
    create: jest.fn((t) => t),
  };
  const userRepo = {
    findOne: jest.fn().mockResolvedValue({ id: 'approver-1', isActive: true, fullName: 'Approver' }),
  };
  const notifications = { dispatch: jest.fn() };
  const audit = { record: jest.fn() };

  const moduleRef = await Test.createTestingModule({
    providers: [
      TasksService,
      { provide: getRepositoryToken(TaskEntity), useValue: taskRepo },
      { provide: getRepositoryToken(ProjectEntity), useValue: {} },
      { provide: getRepositoryToken(SettingEntity), useValue: { findOne: jest.fn().mockResolvedValue({ isActive: true }) } },
      { provide: getRepositoryToken(UserEntity), useValue: userRepo },
      { provide: getRepositoryToken(TaskAssignmentEntity), useValue: { exist: jest.fn().mockResolvedValue(false), findOne: jest.fn() } },
      { provide: getRepositoryToken(TaskCommentEntity), useValue: {} },
      { provide: getRepositoryToken(TaskAttachmentEntity), useValue: {} },
      { provide: getRepositoryToken(TaskRatingEntity), useValue: {} },
      { provide: AuditLogsService, useValue: audit },
      { provide: ProjectsService, useValue: { recomputeStatus: jest.fn() } },
      { provide: TaskWorkflowService, useValue: { assertActionAllowed: jest.fn() } },
      { provide: NotificationsService, useValue: notifications },
    ],
  }).compile();

  return { service: moduleRef.get(TasksService), taskRepo, userRepo, notifications, audit };
}

describe('approval gate helper', () => {
  it('blocks Pending and Rejected, allows Approved / NotRequired', () => {
    expect(() => assertTaskApprovalAllowsWork({ approvalStatus: 'Pending' })).toThrow();
    expect(() => assertTaskApprovalAllowsWork({ approvalStatus: 'Rejected' })).toThrow();
    expect(() => assertTaskApprovalAllowsWork({ approvalStatus: 'Approved' })).not.toThrow();
    expect(() => assertTaskApprovalAllowsWork({ approvalStatus: 'NotRequired' })).not.toThrow();
  });
});

describe('TasksService approval flow', () => {
  const createDto: any = {
    title: 'New',
    priority: 'Medium',
    departmentId: 'dep-1',
    deadlineDate: '2030-01-01',
    needsApproval: true,
    approverId: 'approver-1',
  };

  it('create: creator cannot pick themselves as approver (even Admin)', async () => {
    const { service } = await buildTasksService(baseTask());
    await expect(
      service.create({ ...createDto, approverId: 'admin-1' }, admin),
    ).rejects.toMatchObject({ response: { code: 'APPROVER_CANNOT_BE_TASK_CREATOR' } });
  });

  it('create: cannot assign someone while approval is required', async () => {
    const { service } = await buildTasksService(baseTask());
    await expect(
      service.create({ ...createDto, assignedToId: 'user-9' }, creator),
    ).rejects.toMatchObject({ response: { code: 'CANNOT_ASSIGN_TASK_BEFORE_APPROVAL' } });
  });

  it('create: saves Pending and notifies ONLY the approver', async () => {
    const { service, notifications, taskRepo } = await buildTasksService(baseTask());
    await service.create(createDto, creator);

    expect(taskRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ approvalStatus: 'Pending', approverId: 'approver-1' }),
    );
    expect(notifications.dispatch).toHaveBeenCalledTimes(1);
    expect(notifications.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: 'approver-1', type: 'ApprovalRequested' }),
    );
  });

  it('changeStatus: blocked while approval is Pending', async () => {
    const { service } = await buildTasksService(baseTask());
    await expect(
      service.changeStatus('task-1', { status: 'InProgress' }, creator),
    ).rejects.toMatchObject({ response: { code: 'TASK_AWAITING_APPROVAL' } });
  });

  it('changeStatus: blocked after rejection too (except archiving)', async () => {
    const { service } = await buildTasksService(
      baseTask({ approvalStatus: 'Rejected', status: 'Finished' }),
    );
    await expect(
      service.changeStatus('task-1', { status: 'Reopened', reason: 'long enough reason' }, admin),
    ).rejects.toMatchObject({ response: { code: 'TASK_APPROVAL_REJECTED' } });
  });

  it('approve: creator cannot approve their own task', async () => {
    const { service } = await buildTasksService(baseTask({ createdById: 'approver-1' }));
    await expect(service.approveTask('task-1', approver)).rejects.toMatchObject({
      response: { code: 'CREATOR_CANNOT_DECIDE_OWN_TASK_APPROVAL' },
    });
  });

  it('approve: a stranger cannot decide', async () => {
    const { service } = await buildTasksService(baseTask());
    await expect(service.approveTask('task-1', stranger)).rejects.toMatchObject({
      response: { code: 'ONLY_APPROVER_MAY_DECIDE_TASK_APPROVAL' },
    });
  });

  it('approve: approver approves, creator is notified, task is not assigned or started', async () => {
    const { service, taskRepo, notifications } = await buildTasksService(baseTask());
    await service.approveTask('task-1', approver);

    expect(taskRepo.update).toHaveBeenCalledWith(
      { id: 'task-1', approvalStatus: 'Pending' },
      expect.objectContaining({ approvalStatus: 'Approved' }),
    );
    const patch = (taskRepo.update as jest.Mock).mock.calls[0][1];
    expect(patch.status).toBeUndefined();
    expect(patch.assignedToId).toBeUndefined();
    expect(notifications.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'creator-1',
        type: 'ApprovalDecision',
        metadata: expect.objectContaining({ decision: 'approved' }),
      }),
    );
  });

  it('approve: a decided task cannot be decided again', async () => {
    const { service } = await buildTasksService(baseTask({ approvalStatus: 'Approved' }));
    await expect(service.approveTask('task-1', approver)).rejects.toMatchObject({
      response: { code: 'TASK_IS_NOT_WAITING_FOR_APPROVAL' },
    });
  });

  it('approve: loses the race safely when another decision already landed', async () => {
    const { service, taskRepo } = await buildTasksService(baseTask());
    (taskRepo.update as jest.Mock).mockResolvedValue({ affected: 0 });
    await expect(service.approveTask('task-1', approver)).rejects.toMatchObject({
      response: { code: 'TASK_IS_NOT_WAITING_FOR_APPROVAL' },
    });
  });

  it('reject: closes the task as Finished, stores the reason, notifies the creator', async () => {
    const { service, taskRepo, notifications } = await buildTasksService(baseTask());
    await service.rejectTaskApproval('task-1', { reason: 'Budget is not available' }, approver);

    expect(taskRepo.update).toHaveBeenCalledWith(
      { id: 'task-1', approvalStatus: 'Pending' },
      expect.objectContaining({
        approvalStatus: 'Rejected',
        status: 'Finished',
        rejectionReason: 'Budget is not available',
      }),
    );
    expect(notifications.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'creator-1',
        type: 'ApprovalDecision',
        metadata: expect.objectContaining({ decision: 'rejected' }),
      }),
    );
  });

  it('reject: Admin may decide for the approver, but still never on their own task', async () => {
    const ok = await buildTasksService(baseTask());
    await expect(
      ok.service.rejectTaskApproval('task-1', { reason: 'Not needed anymore' }, admin),
    ).resolves.toBeDefined();

    const own = await buildTasksService(baseTask({ createdById: 'admin-1' }));
    await expect(
      own.service.rejectTaskApproval('task-1', { reason: 'Not needed anymore' }, admin),
    ).rejects.toMatchObject({ response: { code: 'CREATOR_CANNOT_DECIDE_OWN_TASK_APPROVAL' } });
  });

  it('update: approver cannot be swapped after a decision', async () => {
    const { service } = await buildTasksService(baseTask({ approvalStatus: 'Approved' }));
    await expect(
      service.update('task-1', { approverId: 'approver-2' } as any, creator),
    ).rejects.toMatchObject({ response: { code: 'APPROVAL_ALREADY_DECIDED' } });
  });

  it('update: cannot assign through PATCH while approval is Pending', async () => {
    const { service, userRepo } = await buildTasksService(baseTask());
    (userRepo.findOne as jest.Mock).mockResolvedValue({
      id: 'user-9',
      isActive: true,
      teamId: undefined,
      fullName: 'U',
    });
    await expect(
      service.update('task-1', { assignedToId: 'user-9' } as any, admin),
    ).rejects.toMatchObject({ response: { code: 'CANNOT_ASSIGN_TASK_BEFORE_APPROVAL' } });
  });
});

describe('TasksService.findPendingApprovals', () => {
  it('asks only for MY still-Pending approvals and drops archived ones', async () => {
    const { service, taskRepo } = await buildTasksService(baseTask());
    (taskRepo as any).find = jest.fn().mockResolvedValue([
      baseTask({ id: 'a' }),
      baseTask({ id: 'b', archivedAt: new Date() }),
      baseTask({ id: 'c', status: 'Archived' }),
    ]);

    const result = await service.findPendingApprovals(approver);

    expect((taskRepo as any).find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { approverId: 'approver-1', approvalStatus: 'Pending' },
      }),
    );
    expect(result.items.map((t: any) => t.id)).toEqual(['a']);
    expect(result.total).toBe(1);
  });
});


describe('TaskAssignmentsService approval lock', () => {
  async function build(task: any) {
    const assignmentRepo = { findOne: jest.fn().mockResolvedValue(null), save: jest.fn(), create: jest.fn() };
    const taskRepo = { findOne: jest.fn().mockResolvedValue(task), save: jest.fn() };
    const notifications = { dispatch: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        TaskAssignmentsService,
        { provide: getRepositoryToken(TaskAssignmentEntity), useValue: assignmentRepo },
        { provide: getRepositoryToken(TaskEntity), useValue: taskRepo },
        { provide: getRepositoryToken(UserEntity), useValue: { findOne: jest.fn() } },
        { provide: AuditLogsService, useValue: { record: jest.fn() } },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();
    return { service: moduleRef.get(TaskAssignmentsService), notifications, assignmentRepo };
  }

  it('assign: refused while Pending, and nobody is notified', async () => {
    const { service, notifications, assignmentRepo } = await build(baseTask());
    await expect(
      service.assign('task-1', { assigneeId: 'user-9' } as any, creator),
    ).rejects.toMatchObject({ response: { code: 'TASK_AWAITING_APPROVAL' } });
    expect(assignmentRepo.save).not.toHaveBeenCalled();
    expect(notifications.dispatch).not.toHaveBeenCalled();
  });

  it('assign: refused after rejection', async () => {
    const { service } = await build(baseTask({ approvalStatus: 'Rejected', status: 'Finished' }));
    await expect(
      service.assign('task-1', { assigneeId: 'user-9' } as any, admin),
    ).rejects.toMatchObject({ response: { code: 'TASK_APPROVAL_REJECTED' } });
  });
});

describe('TaskAttachmentsService.remove — admin', () => {
  async function build(task: any) {
    const attachment = {
      id: 'att-1',
      fileName: 'a.pdf',
      storageType: 'DATABASE',
      deletedAt: null,
      task,
    };
    const qb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(attachment),
    };
    const attachmentRepo = { createQueryBuilder: jest.fn(() => qb), save: jest.fn() };
    const audit = { record: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        TaskAttachmentsService,
        { provide: getRepositoryToken(TaskAttachmentEntity), useValue: attachmentRepo },
        { provide: getRepositoryToken(TaskEntity), useValue: {} },
        { provide: getRepositoryToken(TaskAssignmentEntity), useValue: {} },
        { provide: AuditLogsService, useValue: audit },
        { provide: SettingsService, useValue: {} },
      ],
    }).compile();
    return { service: moduleRef.get(TaskAttachmentsService), attachmentRepo, audit };
  }

  it('admin can delete an attachment on someone else’s task', async () => {
    const { service, attachmentRepo, audit } = await build({ id: 't', title: 'T', createdById: 'creator-1' });
    await service.remove('att-1', admin);
    expect(attachmentRepo.save).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'SYS_ATTACHMENT_DELETED_BY_ADMIN' }),
    );
  });

  it('the creator still deletes with the owner reason', async () => {
    const { service, audit } = await build({ id: 't', title: 'T', createdById: 'creator-1' });
    await service.remove('att-1', creator);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'SYS_ATTACHMENT_DELETED_BY_OWNER' }),
    );
  });

  it('a non-owner, non-admin still cannot delete', async () => {
    const { service } = await build({ id: 't', title: 'T', createdById: 'creator-1' });
    await expect(service.remove('att-1', stranger)).rejects.toMatchObject({
      response: { code: 'ONLY_TASK_OWNER_MAY_DELETE_ATTACHMENT' },
    });
  });
});
