import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { TaskEntity } from './entities/task.entity';
import { ProjectEntity } from '../projects/entities/project.entity';
import { SettingEntity } from '../settings/entities/setting.entity';
import { UserEntity } from '../users/entities/user.entity';
import { TaskAssignmentEntity } from '../task-assignments/entities/task-assignment.entity';
import { TaskCommentEntity } from '../task-comments/entities/task-comment.entity';
import { TaskAttachmentEntity } from '../task-attachments/entities/task-attachment.entity';
import { TaskRatingEntity } from '../task-ratings/entities/task-rating.entity';
import {
  CreateTaskDto,
  DecideTaskApprovalDto,
  QueryMyTasksDto,
  QueryTasksDto,
  UpdateAttachmentPermissionsDto,
  UpdateTaskDto,
  UpdateTaskStatusDto,
} from './dto/task.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ProjectsService } from '../projects/projects.service';
import { TaskStatus } from '../../shared/enums/task-status.enum';
import { ProjectStatus } from '../../shared/enums/project-status.enum';
import { AuditAction } from '../../shared/enums/audit-action.enum';
import { RoleName } from '../../shared/enums/role.enum';
import { ApprovalStatus } from '../../shared/enums/approval-status.enum';
import { SettingType } from '../../shared/enums/setting-type.enum';
import { AssignmentStatus } from '../../shared/enums/assignment-status.enum';

/**
 * Allowed forward transitions per the Task Lifecycle state diagram.
 * Reopen from Completed and re-cancel handling are validated separately
 * since they carry extra rules.
 */
const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.PENDING]: [TaskStatus.UNASSIGNED, TaskStatus.IN_PROGRESS, TaskStatus.FINISHED],
  [TaskStatus.UNASSIGNED]: [TaskStatus.IN_PROGRESS, TaskStatus.FINISHED],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.PENDING_APPROVAL, TaskStatus.COMPLETED, TaskStatus.FINISHED],
  [TaskStatus.PENDING_APPROVAL]: [TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED],
  [TaskStatus.COMPLETED]: [TaskStatus.REOPENED, TaskStatus.ARCHIVED],
  [TaskStatus.REOPENED]: [TaskStatus.IN_PROGRESS],
  [TaskStatus.FINISHED]: [TaskStatus.ARCHIVED],
  [TaskStatus.ARCHIVED]: [],
};

const TASK_RELATIONS = [
  'branch',
  'department',
  'project',
  'assignedTo',
  'createdBy',
  'approver',
  'parentTask',
  'subTasks',
  'assignments',
  'assignments.assignee',
  'comments',
  'attachments',
  'ratings',
];

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly taskRepo: Repository<TaskEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepo: Repository<ProjectEntity>,
    @InjectRepository(SettingEntity)
    private readonly settingRepo: Repository<SettingEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(TaskAssignmentEntity)
    private readonly assignmentRepo: Repository<TaskAssignmentEntity>,
    @InjectRepository(TaskCommentEntity)
    private readonly commentRepo: Repository<TaskCommentEntity>,
    @InjectRepository(TaskAttachmentEntity)
    private readonly attachmentRepo: Repository<TaskAttachmentEntity>,
    @InjectRepository(TaskRatingEntity)
    private readonly ratingRepo: Repository<TaskRatingEntity>,
    private readonly auditLogsService: AuditLogsService,
    private readonly projectsService: ProjectsService,
  ) {}

  async findAll(query: QueryTasksDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.taskRepo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.branch', 'branch')
      .leftJoinAndSelect('task.department', 'department')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.assignedTo', 'assignedTo')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .orderBy('task.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) qb.andWhere('task.status = :status', { status: query.status });
    if (query.taskType) qb.andWhere('task.taskType = :taskType', { taskType: query.taskType });
    if (query.priority) qb.andWhere('task.priority = :priority', { priority: query.priority });
    if (query.branchId) qb.andWhere('task.branchId = :branchId', { branchId: query.branchId });
    if (query.projectId) qb.andWhere('task.projectId = :projectId', { projectId: query.projectId });
    if (query.departmentId) qb.andWhere('task.departmentId = :departmentId', { departmentId: query.departmentId });
    if (query.assignedToId) qb.andWhere('task.assignedToId = :assignedToId', { assignedToId: query.assignedToId });
    if (query.assigneeId) {
      qb.innerJoin('task.assignments', 'assignment').andWhere('assignment.assigneeId = :assigneeId', {
        assigneeId: query.assigneeId,
      });
    }
    if (query.dueDateFrom) {
      qb.andWhere('task.deadlineDate >= :dueDateFrom', { dueDateFrom: query.dueDateFrom });
    }
    if (query.dueDateTo) {
      qb.andWhere('task.deadlineDate <= :dueDateTo', { dueDateTo: query.dueDateTo });
    }
    if (query.search) {
      qb.andWhere(
        '(task.titleEn ILIKE :search OR task.titleAr ILIKE :search OR task.descriptionEn ILIKE :search OR task.descriptionAr ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [items, total] = await qb.getManyAndCount();

    // Ratings are a one-to-many relation — join+select-ing them here would
    // multiply rows and break `getManyAndCount()`'s pagination (see the
    // note on `findMyTasks` below), so they're loaded separately and
    // attached to the already-paginated page of tasks instead.
    if (items.length > 0) {
      const ratings = await this.taskRepo.manager
        .createQueryBuilder(TaskRatingEntity, 'rating')
        .where('rating.taskId IN (:...taskIds)', { taskIds: items.map((t) => t.id) })
        .getMany();
      const ratingsByTaskId = new Map<string, TaskRatingEntity[]>();
      for (const r of ratings) {
        const list = ratingsByTaskId.get(r.taskId) ?? [];
        list.push(r);
        ratingsByTaskId.set(r.taskId, list);
      }
      for (const task of items) {
        task.ratings = ratingsByTaskId.get(task.id) ?? [];
      }
    }

    return { items, total, page, limit };
  }

  /**
   * "My Tasks": tasks belonging to the current user, either as the single
   * `assignedTo` or via a `task_assignments` row, filtered by importance
   * (priority), average rating, and upcoming deadline.
   *
   * Uses a two-step ID-fetch-then-hydrate pattern (resolve+order the IDs
   * with a lean GROUP BY/HAVING query, then load full relations separately)
   * rather than combining `leftJoinAndSelect` + aggregate ordering +
   * skip/take in one `getManyAndCount()` call — that combination previously
   * hit a TypeORM 0.3.x pagination regression in this codebase.
   */
  async findMyTasks(userId: string, query: QueryMyTasksDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const idQb = this.taskRepo
      .createQueryBuilder('task')
      .leftJoin('task.assignments', 'assignment')
      .leftJoin('task.ratings', 'rating')
      .select('task.id', 'id')
      .addSelect('task.deadlineDate', 'deadlineDate')
      .addSelect('task.priority', 'priority')
      .addSelect('AVG(rating.score)', 'avgRating')
      // A rejected Assignment shouldn't keep the Task on the User's "My
      // Tasks" list — only their direct assignment or a still-live
      // (non-Rejected) task_assignments row counts.
      .where(
        '(task.assignedToId = :userId OR (assignment.assigneeId = :userId AND assignment.status != :rejectedStatus))',
        { userId, rejectedStatus: AssignmentStatus.REJECTED },
      )
      .andWhere('task.archivedAt IS NULL')
      .groupBy('task.id');

    if (query.status) idQb.andWhere('task.status = :status', { status: query.status });
    if (query.priority) idQb.andWhere('task.priority = :priority', { priority: query.priority });
    if (query.projectId) idQb.andWhere('task.projectId = :projectId', { projectId: query.projectId });
    if (query.search) {
      idQb.andWhere(
        '(task.titleEn ILIKE :search OR task.titleAr ILIKE :search OR task.descriptionEn ILIKE :search OR task.descriptionAr ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.upcomingOnly === 'true') {
      idQb
        .andWhere('task.deadlineDate IS NOT NULL')
        .andWhere('task.deadlineDate >= CURRENT_DATE')
        .andWhere('task.status NOT IN (:...doneStatuses)', {
          doneStatuses: [TaskStatus.COMPLETED, TaskStatus.FINISHED, TaskStatus.ARCHIVED],
        });
    }
    if (query.deadlineFrom) {
      idQb.andWhere('task.deadlineDate >= :deadlineFrom', { deadlineFrom: query.deadlineFrom });
    }
    if (query.deadlineTo) {
      idQb.andWhere('task.deadlineDate <= :deadlineTo', { deadlineTo: query.deadlineTo });
    }

    if (query.minRating) {
      idQb.having('AVG(rating.score) >= :minRating', { minRating: Number(query.minRating) });
    }

    const dir = query.sortDir === 'asc' ? 'ASC' : 'DESC';
    switch (query.sortBy) {
      case 'priority':
        idQb.orderBy(
          `CASE task.priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END`,
          query.sortDir === 'desc' ? 'DESC' : 'ASC',
        );
        break;
      case 'rating':
        idQb.orderBy('"avgRating"', dir);
        break;
      case 'createdAt':
        idQb.orderBy('task.createdAt', dir);
        break;
      case 'deadline':
      default:
        // Nearest upcoming deadline first by default; tasks with no
        // deadline sort last regardless of direction.
        idQb.orderBy('task.deadlineDate', query.sortDir === 'desc' ? 'DESC' : 'ASC', 'NULLS LAST');
        break;
    }
    idQb.addOrderBy('task.id', 'ASC'); // stable tiebreaker

    const rawRows = await idQb.getRawMany<{ id: string }>();
    const total = rawRows.length;
    const pageIds = rawRows.slice((page - 1) * limit, (page - 1) * limit + limit).map((r) => r.id);

    if (pageIds.length === 0) {
      return { items: [], total, page, limit };
    }

    const hydrated = await this.taskRepo.find({
      where: { id: In(pageIds) },
      relations: ['branch', 'department', 'project', 'assignedTo', 'createdBy', 'ratings'],
    });
    const byId = new Map(hydrated.map((t) => [t.id, t]));
    const items = pageIds.map((id) => byId.get(id)).filter((t): t is TaskEntity => !!t);

    return { items, total, page, limit };
  }

  /**
   * "Assigned by me": Tasks the current user created (owns) for someone
   * else — i.e. `createdById` is this user but the Task isn't just a
   * private, self-assigned Task. Lets a Task owner see, edit, and manage
   * (finish/archive) everything they've handed out, mirroring the filters
   * available on "My Tasks".
   */
  async findAssignedByMe(userId: string, query: QueryMyTasksDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const idQb = this.taskRepo
      .createQueryBuilder('task')
      .leftJoin('task.ratings', 'rating')
      .select('task.id', 'id')
      .addSelect('task.deadlineDate', 'deadlineDate')
      .addSelect('task.priority', 'priority')
      .addSelect('AVG(rating.score)', 'avgRating')
      .where('task.createdById = :userId', { userId })
      .andWhere('(task.assignedToId IS NULL OR task.assignedToId != :userId)', { userId })
      .andWhere('task.archivedAt IS NULL')
      .groupBy('task.id');

    if (query.status) idQb.andWhere('task.status = :status', { status: query.status });
    if (query.priority) idQb.andWhere('task.priority = :priority', { priority: query.priority });
    if (query.projectId) idQb.andWhere('task.projectId = :projectId', { projectId: query.projectId });
    if (query.search) {
      idQb.andWhere(
        '(task.titleEn ILIKE :search OR task.titleAr ILIKE :search OR task.descriptionEn ILIKE :search OR task.descriptionAr ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.upcomingOnly === 'true') {
      idQb
        .andWhere('task.deadlineDate IS NOT NULL')
        .andWhere('task.deadlineDate >= CURRENT_DATE')
        .andWhere('task.status NOT IN (:...doneStatuses)', {
          doneStatuses: [TaskStatus.COMPLETED, TaskStatus.FINISHED, TaskStatus.ARCHIVED],
        });
    }
    if (query.deadlineFrom) {
      idQb.andWhere('task.deadlineDate >= :deadlineFrom', { deadlineFrom: query.deadlineFrom });
    }
    if (query.deadlineTo) {
      idQb.andWhere('task.deadlineDate <= :deadlineTo', { deadlineTo: query.deadlineTo });
    }

    if (query.minRating) {
      idQb.having('AVG(rating.score) >= :minRating', { minRating: Number(query.minRating) });
    }

    const dir = query.sortDir === 'asc' ? 'ASC' : 'DESC';
    switch (query.sortBy) {
      case 'priority':
        idQb.orderBy(
          `CASE task.priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END`,
          query.sortDir === 'desc' ? 'DESC' : 'ASC',
        );
        break;
      case 'rating':
        idQb.orderBy('"avgRating"', dir);
        break;
      case 'createdAt':
        idQb.orderBy('task.createdAt', dir);
        break;
      case 'deadline':
      default:
        idQb.orderBy('task.deadlineDate', query.sortDir === 'desc' ? 'DESC' : 'ASC', 'NULLS LAST');
        break;
    }
    idQb.addOrderBy('task.id', 'ASC'); // stable tiebreaker

    const rawRows = await idQb.getRawMany<{ id: string }>();
    const total = rawRows.length;
    const pageIds = rawRows.slice((page - 1) * limit, (page - 1) * limit + limit).map((r) => r.id);

    if (pageIds.length === 0) {
      return { items: [], total, page, limit };
    }

    const hydrated = await this.taskRepo.find({
      where: { id: In(pageIds) },
      relations: ['branch', 'department', 'project', 'assignedTo', 'createdBy', 'ratings'],
    });
    const byId = new Map(hydrated.map((t) => [t.id, t]));
    const items = pageIds.map((id) => byId.get(id)).filter((t): t is TaskEntity => !!t);

    return { items, total, page, limit };
  }

  async findOne(id: string): Promise<TaskEntity> {
    const task = await this.taskRepo.findOne({ where: { id }, relations: TASK_RELATIONS });
    if (!task) throw new NotFoundException('Task not found');

    task.attachments = (task.attachments || []).filter((attachment) => !attachment.deletedAt);
    task.comments = (task.comments || []).filter((comment) => !comment.deletedAt);
    return task;
  }

  async create(dto: CreateTaskDto, actor: UserEntity): Promise<TaskEntity> {
    if (dto.branchId) {
      const branch = await this.settingRepo.findOne({
        where: { id: dto.branchId, type: SettingType.BRANCH },
      });
      if (!branch || !branch.isActive) {
        throw new BadRequestException('Target Branch is invalid or inactive');
      }
    }

    let project: ProjectEntity | null = null;
    if (dto.projectId) {
      project = await this.projectRepo.findOne({ where: { id: dto.projectId } });
      if (!project) throw new NotFoundException('Project not found');
      if (project.status === ProjectStatus.ARCHIVED) {
        throw new BadRequestException('Cannot create a Task under an archived Project');
      }
    }

    let parentTask: TaskEntity | null = null;
    if (dto.parentTaskId) {
      parentTask = await this.taskRepo.findOne({ where: { id: dto.parentTaskId } });
      if (!parentTask) throw new NotFoundException('Parent Task not found');
      if (parentTask.archivedAt) {
        throw new BadRequestException('Cannot attach a Sub-task to an archived parent Task');
      }
      // Sub-task deadline cannot exceed Parent Task's deadline.
      if (dto.deadlineDate && parentTask.deadlineDate && dto.deadlineDate > parentTask.deadlineDate) {
        throw new BadRequestException("Sub-task deadline cannot exceed its Parent Task's deadline");
      }
    }

    if (dto.assignedToId) {
      const assignee = await this.userRepo.findOne({ where: { id: dto.assignedToId }, relations: ['role'] });
      if (!assignee) throw new NotFoundException('Assigned User (for whom the task is) not found');
      if (!assignee.isActive) {
        throw new BadRequestException('Cannot create a Task for a deactivated User');
      }
      if (assignee.role.name === RoleName.ADMIN) {
        throw new BadRequestException('Cannot assign a Task to an Admin');
      }
    }

    const needsApproval = !!dto.needsApproval;
    if (needsApproval && !dto.approverId) {
      throw new BadRequestException('An approver is required when the Task needs approval');
    }
    if (dto.approverId) {
      const approver = await this.userRepo.findOne({ where: { id: dto.approverId } });
      if (!approver) throw new NotFoundException('Approver not found');
    }

    const needsBudget = !!dto.needsBudget;
    if (needsBudget && dto.budgetMin && dto.budgetMax && Number(dto.budgetMin) > Number(dto.budgetMax)) {
      throw new BadRequestException('Money range minimum cannot exceed the maximum');
    }

    const task = await this.taskRepo.save(
      this.taskRepo.create({
        titleAr: dto.titleAr,
        titleEn: dto.titleEn,
        descriptionAr: dto.descriptionAr,
        descriptionEn: dto.descriptionEn,
        taskType: dto.taskType,
        priority: dto.priority,
        color: dto.color,
        branchId: dto.branchId,
        departmentId: dto.departmentId,
        projectId: dto.projectId,
        parentTaskId: dto.parentTaskId,
        assignedToId: dto.assignedToId,
        createdById: actor.id,
        needsApproval,
        approverId: needsApproval ? dto.approverId : undefined,
        approvalStatus: needsApproval ? ApprovalStatus.PENDING : ApprovalStatus.NOT_REQUIRED,
        needsBudget,
        budgetMin: needsBudget ? dto.budgetMin : undefined,
        budgetMax: needsBudget ? dto.budgetMax : undefined,
        budgetCurrency: needsBudget ? (dto.budgetCurrency ?? 'SAR') : undefined,
        startDate: dto.startDate,
        deadlineDate: dto.deadlineDate,
        status: TaskStatus.PENDING,
      }),
    );

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'Task',
      entityId: task.id,
      action: AuditAction.CREATE,
      newValue: task,
    });

    return this.findOne(task.id);
  }

  async update(id: string, dto: UpdateTaskDto, actor: UserEntity): Promise<TaskEntity> {
    const task = await this.findOne(id);

    const isAdmin = actor.role.name === RoleName.ADMIN;
    if (!isAdmin && task.createdById !== actor.id) {
      throw new ForbiddenException('Only the Task creator or Admin may edit this Task');
    }

    if (task.archivedAt) {
      throw new BadRequestException('Cannot edit an archived Task');
    }
    if (task.status === TaskStatus.PENDING_APPROVAL && actor.role.name !== RoleName.ADMIN) {
      throw new ForbiddenException('Task is pending approval and cannot be edited until a decision is made');
    }

    if (dto.parentTaskId) {
      await this.assertNoCircularReference(task.id, dto.parentTaskId);
    }

    const effectiveDeadline = dto.deadlineDate ?? task.deadlineDate;
    if (dto.parentTaskId || task.parentTaskId) {
      const parentId = dto.parentTaskId ?? task.parentTaskId!;
      const parent = await this.taskRepo.findOne({ where: { id: parentId } });
      if (parent?.deadlineDate && effectiveDeadline && effectiveDeadline > parent.deadlineDate) {
        throw new BadRequestException("Sub-task deadline cannot exceed its Parent Task's deadline");
      }
    }

    // Deadline, once set, cannot move earlier than today without Admin override.
    if (dto.deadlineDate && task.deadlineDate && dto.deadlineDate < task.deadlineDate) {
      const today = new Date().toISOString().slice(0, 10);
      if (dto.deadlineDate < today && actor.role.name !== RoleName.ADMIN) {
        throw new ForbiddenException('Moving the deadline earlier than today requires Admin override');
      }
    }

    if (dto.needsBudget !== undefined ? dto.needsBudget : task.needsBudget) {
      const min = dto.budgetMin ?? task.budgetMin;
      const max = dto.budgetMax ?? task.budgetMax;
      if (min && max && Number(min) > Number(max)) {
        throw new BadRequestException('Money range minimum cannot exceed the maximum');
      }
    }

    if ((dto.needsApproval ?? task.needsApproval) && !(dto.approverId ?? task.approverId)) {
      throw new BadRequestException('An approver is required when the Task needs approval');
    }

    if (dto.assignedToId) {
      const assignee = await this.userRepo.findOne({ where: { id: dto.assignedToId }, relations: ['role'] });
      if (!assignee) throw new NotFoundException('Assigned User (for whom the task is) not found');
      if (!assignee.isActive) {
        throw new BadRequestException('Cannot assign a Task to a deactivated User');
      }
      if (assignee.role.name === RoleName.ADMIN) {
        throw new BadRequestException('Cannot assign a Task to an Admin');
      }
    }

    const oldValue = { ...task };
    Object.assign(task, dto);

    // Keep approvalStatus consistent if the approval requirement changed.
    if (dto.needsApproval === false) {
      task.approvalStatus = ApprovalStatus.NOT_REQUIRED;
      task.approverId = undefined;
      task.rejectionReason = undefined;
    } else if (dto.needsApproval === true && oldValue.approvalStatus === ApprovalStatus.NOT_REQUIRED) {
      task.approvalStatus = ApprovalStatus.PENDING;
    }

    const saved = await this.taskRepo.save(task);

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'Task',
      entityId: saved.id,
      action: AuditAction.UPDATE,
      oldValue,
      newValue: saved,
    });

    return this.findOne(saved.id);
  }

  // BR-070: only the Task creator or Admin may decide whether the assigned
  // User(s) can download this Task's attachments. Kept as its own endpoint
  // (rather than folded into the general update()) since it's the one Task
  // field with an explicit creator-only rule.
  async updateAttachmentPermissions(
    id: string,
    dto: UpdateAttachmentPermissionsDto,
    actor: UserEntity,
  ): Promise<TaskEntity> {
    const task = await this.findOne(id);

    const isAdmin = actor.role.name === RoleName.ADMIN;
    if (!isAdmin && task.createdById !== actor.id) {
      throw new ForbiddenException('Only the Task creator or Admin may change attachment download permissions');
    }

    const oldValue = { assigneeCanDownloadAttachments: task.assigneeCanDownloadAttachments };
    await this.taskRepo.update(id, {
      assigneeCanDownloadAttachments: dto.assigneeCanDownloadAttachments,
    });

    const saved = await this.findOne(id);

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'Task',
      entityId: saved.id,
      action: AuditAction.UPDATE,
      oldValue,
      newValue: { assigneeCanDownloadAttachments: saved.assigneeCanDownloadAttachments },
    });

    return saved;
  }

  // No self-reference, no circular ancestry.
  private async assertNoCircularReference(taskId: string, newParentId: string): Promise<void> {
    if (taskId === newParentId) {
      throw new BadRequestException('A Task cannot reference itself as its own parent');
    }
    let currentId: string | undefined = newParentId;
    const visited = new Set<string>();
    while (currentId) {
      if (currentId === taskId) {
        throw new BadRequestException('This change would create a circular Task hierarchy');
      }
      if (visited.has(currentId)) break;
      visited.add(currentId);
      const ancestor: TaskEntity | null = await this.taskRepo.findOne({ where: { id: currentId } });
      currentId = ancestor?.parentTaskId;
    }
  }

  async changeStatus(id: string, dto: UpdateTaskStatusDto, actor: UserEntity): Promise<TaskEntity> {
    const task = await this.findOne(id);

    await this.assertCanChangeStatus(task, actor);

    if (task.archivedAt) {
      throw new BadRequestException('Cannot change the status of an archived Task');
    }

    if (dto.status === TaskStatus.REOPENED) {
      return this.reopen(task, dto.reason!, actor);
    }

    if (task.status === TaskStatus.FINISHED && dto.status !== TaskStatus.ARCHIVED) {
      if (actor.role.name !== RoleName.ADMIN) {
        throw new ForbiddenException('A Finished Task can only be reopened by Admin');
      }
    }

    const allowedNext = ALLOWED_TRANSITIONS[task.status] ?? [];
    if (!allowedNext.includes(dto.status)) {
      if (task.status === TaskStatus.COMPLETED && dto.status === TaskStatus.PENDING) {
        throw new ConflictException('A Completed Task cannot transition back to Pending');
      }
      throw new ConflictException(`Cannot transition Task from ${task.status} to ${dto.status}`);
    }

    // A Task that needs approval must go through PendingApproval + a
    // decision before it can be marked Completed directly.
    if (
      dto.status === TaskStatus.COMPLETED &&
      task.needsApproval &&
      task.approvalStatus !== ApprovalStatus.APPROVED
    ) {
      throw new ConflictException(
        'This Task requires approval; route it through PendingApproval and have the approver decide first',
      );
    }

    if (dto.status === TaskStatus.COMPLETED) {
      const subTasks = await this.taskRepo.find({ where: { parentTaskId: task.id } });
      const hasIncomplete = subTasks.some(
        (st) => st.status !== TaskStatus.COMPLETED && st.status !== TaskStatus.FINISHED,
      );
      if (hasIncomplete) {
        throw new ConflictException(
          'Cannot mark a Task Completed while it has open (non-completed) Sub-tasks',
        );
      }
    }

    if (dto.status === TaskStatus.FINISHED && !dto.reason) {
      throw new BadRequestException('A reason is required to finish a Task');
    }

    const oldValue = { status: task.status };
    if (dto.status === TaskStatus.ARCHIVED) {
      task.statusBeforeArchive = task.status;
      task.archivedAt = new Date();
    }
    task.status = dto.status;
    if (dto.status === TaskStatus.COMPLETED) task.actualEndDate = new Date();

    const saved = await this.taskRepo.save(task);

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'Task',
      entityId: saved.id,
      action: AuditAction.STATUS_CHANGE,
      oldValue,
      newValue: { status: saved.status },
      reason: dto.reason,
    });

    if (saved.projectId) {
      await this.projectsService.recomputeStatus(saved.projectId);
    }

    return this.findOne(saved.id);
  }

  // The designated approver (or Admin) decides on a Task that needs approval.
  async decideApproval(id: string, dto: DecideTaskApprovalDto, actor: UserEntity): Promise<TaskEntity> {
    const task = await this.findOne(id);

    if (!task.needsApproval) {
      throw new BadRequestException('This Task does not require approval');
    }
    if (actor.role.name !== RoleName.ADMIN && task.approverId !== actor.id) {
      throw new ForbiddenException('Only the designated approver or Admin may decide on this Task');
    }
    if (task.approvalStatus !== ApprovalStatus.PENDING) {
      throw new ConflictException('This Task has already been decided on');
    }

    const oldValue = { approvalStatus: task.approvalStatus, status: task.status };

    if (dto.approve) {
      task.approvalStatus = ApprovalStatus.APPROVED;
      task.rejectionReason = undefined;
      task.status = TaskStatus.COMPLETED;
      task.actualEndDate = new Date();
    } else {
      task.approvalStatus = ApprovalStatus.REJECTED;
      task.rejectionReason = dto.rejectionReason;
      task.status = TaskStatus.IN_PROGRESS;
    }

    const saved = await this.taskRepo.save(task);

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'Task',
      entityId: saved.id,
      action: dto.approve ? AuditAction.APPROVE : AuditAction.REJECT,
      oldValue,
      newValue: { approvalStatus: saved.approvalStatus, status: saved.status },
      reason: dto.rejectionReason,
    });

    if (saved.projectId) {
      await this.projectsService.recomputeStatus(saved.projectId);
    }

    return this.findOne(saved.id);
  }

  private async assertCanChangeStatus(task: TaskEntity, actor: UserEntity): Promise<void> {
    if (actor.role.name === RoleName.ADMIN || task.createdById === actor.id) return;
    if (task.assignedToId === actor.id) return;
    const isAssignee = await this.assignmentRepo.exist({
      where: { taskId: task.id, assigneeId: actor.id },
    });
    if (!isAssignee) {
      throw new ForbiddenException('Only the assigned User(s), the Task creator, or Admin may change status');
    }
  }

  private async reopen(task: TaskEntity, reason: string, actor: UserEntity): Promise<TaskEntity> {
    if (actor.role.name !== RoleName.ADMIN) {
      throw new ForbiddenException('Only Admin may reopen a Task');
    }
    if (task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.FINISHED) {
      throw new ConflictException('Only a Completed or Finished Task can be reopened');
    }

    const oldValue = { status: task.status };
    task.status = TaskStatus.REOPENED;
    const saved = await this.taskRepo.save(task);

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'Task',
      entityId: saved.id,
      action: AuditAction.STATUS_CHANGE,
      oldValue,
      newValue: { status: saved.status },
      reason,
    });

    if (saved.projectId) {
      await this.projectsService.recomputeStatus(saved.projectId);
    }

    return this.findOne(saved.id);
  }

  // Soft-delete (archive) by default; hard delete Admin-only and only
  // permitted when the Task has no Assignments/Comments/Attachments/Ratings.
  async remove(id: string, actor: UserEntity, hardDelete = false): Promise<void> {
    const task = await this.findOne(id);

    if (hardDelete) {
      if (actor.role.name !== RoleName.ADMIN) {
        throw new ForbiddenException('Only Admin may permanently delete a Task');
      }
      const [assignments, comments, attachments, ratings] = await Promise.all([
        this.assignmentRepo.count({ where: { taskId: id } }),
        this.commentRepo.count({ where: { taskId: id } }),
        this.attachmentRepo.count({ where: { taskId: id } }),
        this.ratingRepo.count({ where: { taskId: id } }),
      ]);
      if (assignments + comments + attachments + ratings > 0) {
        throw new BadRequestException(
          'Cannot permanently delete a Task that has Assignments, Comments, Attachments, or Ratings',
        );
      }
      await this.taskRepo.remove(task);
      await this.auditLogsService.record({
        actorId: actor.id,
        entityType: 'Task',
        entityId: id,
        action: AuditAction.DELETE,
        reason: 'Hard delete',
      });
      return;
    }

    if (actor.role.name !== RoleName.ADMIN && task.createdById !== actor.id) {
      throw new ForbiddenException('Only the Task creator or Admin may archive this Task');
    }

    task.statusBeforeArchive = task.status;
    task.archivedAt = new Date();
    task.status = TaskStatus.ARCHIVED;
    await this.taskRepo.save(task);

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'Task',
      entityId: id,
      action: AuditAction.ARCHIVE,
    });
  }

  // Restores an archived Task to whatever status it held right before it
  // was archived (falling back to Pending for older rows archived before
  // this tracking existed). Admin-only, mirroring reopen()'s restriction.
  async unarchive(id: string, actor: UserEntity): Promise<TaskEntity> {
    if (actor.role.name !== RoleName.ADMIN) {
      throw new ForbiddenException('Only Admin may unarchive a Task');
    }

    const task = await this.findOne(id);
    if (task.status !== TaskStatus.ARCHIVED) {
      throw new ConflictException('Only an Archived Task can be unarchived');
    }

    const oldValue = { status: task.status, archivedAt: task.archivedAt };
    task.status = task.statusBeforeArchive ?? TaskStatus.PENDING;
    task.archivedAt = undefined;
    task.statusBeforeArchive = undefined;
    const saved = await this.taskRepo.save(task);

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'Task',
      entityId: saved.id,
      action: AuditAction.RESTORE,
      oldValue,
      newValue: { status: saved.status },
    });

    if (saved.projectId) {
      await this.projectsService.recomputeStatus(saved.projectId);
    }

    return this.findOne(saved.id);
  }
}