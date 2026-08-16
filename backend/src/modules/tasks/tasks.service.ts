import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import {
  In,
  Repository,
} from 'typeorm';

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

/*
 * ============================================================
 * BUILT-IN TASK WORKFLOW
 * ============================================================
 */

const ALLOWED_TRANSITIONS: Record<
  TaskStatus,
  TaskStatus[]
> = {
  [TaskStatus.PENDING]: [
    TaskStatus.UNASSIGNED,
    TaskStatus.IN_PROGRESS,
    TaskStatus.FINISHED,
  ],

  [TaskStatus.UNASSIGNED]: [
    TaskStatus.IN_PROGRESS,
    TaskStatus.FINISHED,
  ],

  [TaskStatus.IN_PROGRESS]: [
    TaskStatus.PENDING_APPROVAL,
    TaskStatus.COMPLETED,
    TaskStatus.FINISHED,
  ],

  [TaskStatus.PENDING_APPROVAL]: [
    TaskStatus.IN_PROGRESS,
    TaskStatus.COMPLETED,
  ],

  [TaskStatus.COMPLETED]: [
    TaskStatus.REOPENED,
    TaskStatus.ARCHIVED,
  ],

  [TaskStatus.REOPENED]: [
    TaskStatus.IN_PROGRESS,
  ],

  [TaskStatus.FINISHED]: [
    TaskStatus.ARCHIVED,
  ],

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

/*
 * ============================================================
 * SERVICE
 * ============================================================
 */

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

  /*
   * ==========================================================
   * VALIDATION HELPERS
   * ==========================================================
   */

  private async assertValidListValue(
    type: SettingType,
    key: string,
    label: string,
  ): Promise<void> {
    const row =
      await this.settingRepo.findOne({
        where: {
          type,
          key,
          isActive: true,
        },
      });

    if (!row) {
      throw new BadRequestException(
        `"${key}" is not a valid, active ${label}`,
      );
    }
  }

  private async assertActiveSettingById(
    type: SettingType,
    id: string,
    label: string,
  ): Promise<SettingEntity> {
    const setting =
      await this.settingRepo.findOne({
        where: {
          id,
          type,
        },
      });

    if (!setting) {
      throw new BadRequestException(
        `${label} is invalid`,
      );
    }

    if (!setting.isActive) {
      throw new BadRequestException(
        `${label} is inactive`,
      );
    }

    return setting;
  }

  private async assertUsableProject(
    projectId: string,
  ): Promise<ProjectEntity> {
    const project =
      await this.projectRepo.findOne({
        where: {
          id: projectId,
        },
      });

    if (!project) {
      throw new NotFoundException(
        'Project not found',
      );
    }

    if (
      project.status ===
      ProjectStatus.ARCHIVED
    ) {
      throw new BadRequestException(
        'Cannot use an archived Project',
      );
    }

    return project;
  }

  private async assertValidAssignee(
    userId: string,
  ): Promise<UserEntity> {
    const assignee =
      await this.userRepo.findOne({
        where: {
          id: userId,
        },

        relations: [
          'role',
        ],
      });

    if (!assignee) {
      throw new NotFoundException(
        'Assigned User not found',
      );
    }

    if (!assignee.isActive) {
      throw new BadRequestException(
        'Cannot assign a Task to a deactivated User',
      );
    }

    if (
      assignee.role.name ===
      RoleName.ADMIN
    ) {
      throw new BadRequestException(
        'Cannot assign a Task to an Admin',
      );
    }

    return assignee;
  }

  private async assertValidApprover(
    userId: string,
  ): Promise<UserEntity> {
    const approver =
      await this.userRepo.findOne({
        where: {
          id: userId,
        },

        relations: [
          'role',
        ],
      });

    if (!approver) {
      throw new NotFoundException(
        'Approver not found',
      );
    }

    if (!approver.isActive) {
      throw new BadRequestException(
        'Cannot use a deactivated User as the approver',
      );
    }

    return approver;
  }

  private assertAssigneeAndApproverDifferent(
    assignedToId?: string | null,
    approverId?: string | null,
  ): void {
    if (
      assignedToId &&
      approverId &&
      assignedToId === approverId
    ) {
      throw new BadRequestException(
        'The Task assignee and approver cannot be the same User',
      );
    }
  }

  private assertValidDateRange(
    startDate?: string | null,
    deadlineDate?: string | null,
  ): void {
    if (
      startDate &&
      deadlineDate &&
      deadlineDate < startDate
    ) {
      throw new BadRequestException(
        'Task deadline cannot be before the start date',
      );
    }
  }

  private assertValidBudgetRange(
    minimum?: string | null,
    maximum?: string | null,
  ): void {
    if (
      minimum !== undefined &&
      minimum !== null &&
      maximum !== undefined &&
      maximum !== null &&
      Number(minimum) >
        Number(maximum)
    ) {
      throw new BadRequestException(
        'Money range minimum cannot exceed the maximum',
      );
    }
  }

  private assertBudgetComplete(
    needsBudget: boolean,
    minimum?: string | null,
    maximum?: string | null,
  ): void {
    if (!needsBudget) {
      return;
    }

    if (
      minimum === undefined ||
      minimum === null ||
      minimum === '' ||
      maximum === undefined ||
      maximum === null ||
      maximum === ''
    ) {
      throw new BadRequestException(
        'Budget minimum and maximum are required when the Task needs a budget',
      );
    }

    this.assertValidBudgetRange(
      minimum,
      maximum,
    );
  }

  private async assertNoOpenSubTasks(
    taskId: string,
  ): Promise<void> {
    const subTasks =
      await this.taskRepo.find({
        where: {
          parentTaskId:
            taskId,
        },
      });

    const hasIncomplete =
      subTasks.some(
        (subTask) =>
          subTask.status !==
            TaskStatus.COMPLETED &&
          subTask.status !==
            TaskStatus.FINISHED,
      );

    if (hasIncomplete) {
      throw new ConflictException(
        'Cannot complete a Task while it has open Sub-tasks',
      );
    }
  }

  /*
   * ==========================================================
   * ALL TASKS
   * ==========================================================
   */

  async findAll(
  query: QueryTasksDto,
) {
  /*
   * ==========================================================
   * PAGINATION
   * ==========================================================
   */

  const page =
    query.page ??
    1;


  const limit =
    query.limit ??
    20;


  /*
   * ==========================================================
   * VALIDATE FILTER DATE RANGES
   * ==========================================================
   */

  if (
    query.dueDateFrom &&
    query.dueDateTo &&
    query.dueDateTo <
      query.dueDateFrom
  ) {
    throw new BadRequestException(
      'Deadline "to" date cannot be before the "from" date',
    );
  }


  if (
    query.startDateFrom &&
    query.startDateTo &&
    query.startDateTo <
      query.startDateFrom
  ) {
    throw new BadRequestException(
      'Start date "to" cannot be before the "from" date',
    );
  }


  if (
    query.createdDateFrom &&
    query.createdDateTo &&
    query.createdDateTo <
      query.createdDateFrom
  ) {
    throw new BadRequestException(
      'Created date "to" cannot be before the "from" date',
    );
  }


  /*
   * ==========================================================
   * BASE QUERY
   * ==========================================================
   */

  const qb =
    this.taskRepo
      .createQueryBuilder(
        'task',
      )
      .leftJoinAndSelect(
        'task.branch',
        'branch',
      )
      .leftJoinAndSelect(
        'task.department',
        'department',
      )
      .leftJoinAndSelect(
        'task.project',
        'project',
      )
      .leftJoinAndSelect(
        'task.assignedTo',
        'assignedTo',
      )
      .leftJoinAndSelect(
        'task.createdBy',
        'createdBy',
      );


  /*
   * ==========================================================
   * STATUS
   * ==========================================================
   */

  if (
    query.status
  ) {
    qb.andWhere(
      'task.status = :status',
      {
        status:
          query.status,
      },
    );
  }


  if (
    query.excludeArchived ===
      'true' &&
    query.status !==
      TaskStatus.ARCHIVED
  ) {
    qb.andWhere(
      'task.status != :archivedStatus',
      {
        archivedStatus:
          TaskStatus.ARCHIVED,
      },
    );
  }


  /*
   * ==========================================================
   * CLASSIFICATION
   * ==========================================================
   */

  if (
    query.taskType
  ) {
    qb.andWhere(
      'task.taskType = :taskType',
      {
        taskType:
          query.taskType,
      },
    );
  }


  if (
    query.priority
  ) {
    qb.andWhere(
      'task.priority = :priority',
      {
        priority:
          query.priority,
      },
    );
  }


  /*
   * ==========================================================
   * ORGANIZATION
   * ==========================================================
   */

  if (
    query.branchId
  ) {
    qb.andWhere(
      'task.branchId = :branchId',
      {
        branchId:
          query.branchId,
      },
    );
  }


  if (
    query.projectId
  ) {
    qb.andWhere(
      'task.projectId = :projectId',
      {
        projectId:
          query.projectId,
      },
    );
  }


  if (
    query.departmentId
  ) {
    qb.andWhere(
      'task.departmentId = :departmentId',
      {
        departmentId:
          query.departmentId,
      },
    );
  }


  /*
   * ==========================================================
   * PEOPLE
   * ==========================================================
   */

  if (
    query.createdById
  ) {
    qb.andWhere(
      'task.createdById = :createdById',
      {
        createdById:
          query.createdById,
      },
    );
  }


  /*
   * Current assignee.
   *
   * Task.assignedToId is synchronized with the Assignment
   * workflow, so this represents the current assignee.
   */
  if (
    query.assignedToId
  ) {
    qb.andWhere(
      'task.assignedToId = :assignedToId',
      {
        assignedToId:
          query.assignedToId,
      },
    );
  }


  /*
   * Historical / Assignment-record assignee.
   *
   * Keep this because other parts of the app may use it.
   */
  if (
    query.assigneeId
  ) {
    qb
      .innerJoin(
        'task.assignments',
        'assignment',
      )
      .andWhere(
        'assignment.assigneeId = :assigneeId',
        {
          assigneeId:
            query.assigneeId,
        },
      );
  }


  /*
   * ==========================================================
   * BILINGUAL SEARCH
   * ==========================================================
   */

  if (
    query.search?.trim()
  ) {
    const search =
      `%${query.search.trim()}%`;


    qb.andWhere(
      `(
        task.titleEn ILIKE :search
        OR task.titleAr ILIKE :search
        OR task.descriptionEn ILIKE :search
        OR task.descriptionAr ILIKE :search
        OR createdBy.fullName ILIKE :search
        OR assignedTo.fullName ILIKE :search
        OR project.name ILIKE :search
      )`,
      {
        search,
      },
    );
  }


  /*
   * ==========================================================
   * DEADLINE FILTER
   * ==========================================================
   */

  if (
    query.dueDateFrom
  ) {
    qb.andWhere(
      'task.deadlineDate >= :dueDateFrom',
      {
        dueDateFrom:
          query.dueDateFrom,
      },
    );
  }


  if (
    query.dueDateTo
  ) {
    qb.andWhere(
      'task.deadlineDate <= :dueDateTo',
      {
        dueDateTo:
          query.dueDateTo,
      },
    );
  }


  /*
   * Has / does not have a deadline.
   */
  if (
    query.hasDeadline ===
    'true'
  ) {
    qb.andWhere(
      'task.deadlineDate IS NOT NULL',
    );
  }


  if (
    query.hasDeadline ===
    'false'
  ) {
    qb.andWhere(
      'task.deadlineDate IS NULL',
    );
  }


  /*
   * ==========================================================
   * OVERDUE
   * ==========================================================
   *
   * Overdue means:
   *
   * deadline exists
   * deadline is before today
   * task is not Completed / Finished / Archived
   */

  if (
    query.overdueOnly ===
    'true'
  ) {
    qb.andWhere(
      'task.deadlineDate IS NOT NULL',
    );


    qb.andWhere(
      'task.deadlineDate < CURRENT_DATE',
    );


    qb.andWhere(
      'task.status NOT IN (:...doneStatuses)',
      {
        doneStatuses: [
          TaskStatus.COMPLETED,
          TaskStatus.FINISHED,
          TaskStatus.ARCHIVED,
        ],
      },
    );
  }


  /*
   * ==========================================================
   * START DATE
   * ==========================================================
   */

  if (
    query.startDateFrom
  ) {
    qb.andWhere(
      'task.startDate >= :startDateFrom',
      {
        startDateFrom:
          query.startDateFrom,
      },
    );
  }


  if (
    query.startDateTo
  ) {
    qb.andWhere(
      'task.startDate <= :startDateTo',
      {
        startDateTo:
          query.startDateTo,
      },
    );
  }


  /*
   * ==========================================================
   * CREATED DATE
   * ==========================================================
   */

  if (
    query.createdDateFrom
  ) {
    qb.andWhere(
      'task.createdAt >= :createdDateFrom',
      {
        createdDateFrom:
          query.createdDateFrom,
      },
    );
  }


  /*
   * Include the entire "to" date.
   *
   * Example:
   *
   * 2026-08-16 means:
   *
   * createdAt < 2026-08-17 00:00
   */
  if (
    query.createdDateTo
  ) {
    qb.andWhere(
      `task.createdAt < (
        :createdDateTo::date +
        INTERVAL '1 day'
      )`,
      {
        createdDateTo:
          query.createdDateTo,
      },
    );
  }


  /*
   * ==========================================================
   * SORT
   * ==========================================================
   */

  const sortColumns: Record<
    string,
    string
  > = {
    createdAt:
      'task.createdAt',

    deadline:
      'task.deadlineDate',

    startDate:
      'task.startDate',

    /*
     * English title is used for DB ordering.
     *
     * The display still follows the currently selected frontend
     * language.
     */
    title:
      'task.titleEn',

    status:
      'task.status',

    taskType:
      'task.taskType',
  };


  const sortColumn =
    sortColumns[
      query.sortBy ??
        'createdAt'
    ] ??
    'task.createdAt';


  const sortDirection =
    query.sortDir ===
    'asc'
      ? 'ASC'
      : 'DESC';


  /*
   * Date fields with null values should appear at the end instead
   * of pushing "No deadline" Tasks ahead of real deadlines.
   */
  const nulls =
    query.sortBy ===
      'deadline' ||
    query.sortBy ===
      'startDate'
      ? 'NULLS LAST'
      : undefined;


  qb.orderBy(
    sortColumn,
    sortDirection,
    nulls,
  );


  /*
   * Stable secondary sorting.
   */
  if (
    sortColumn !==
    'task.createdAt'
  ) {
    qb.addOrderBy(
      'task.createdAt',
      'DESC',
    );
  }


  /*
   * ==========================================================
   * PAGINATION
   * ==========================================================
   */

  qb
    .skip(
      (
        page -
        1
      ) *
      limit,
    )
    .take(
      limit,
    );


  /*
   * ==========================================================
   * EXECUTE
   * ==========================================================
   */

  const [
    items,
    total,
  ] =
    await qb.getManyAndCount();


  /*
   * ==========================================================
   * RATINGS
   * ==========================================================
   *
   * Keep your existing batched rating lookup.
   */

  if (
    items.length >
    0
  ) {
    const ratings =
      await this.taskRepo.manager
        .createQueryBuilder(
          TaskRatingEntity,
          'rating',
        )
        .where(
          'rating.taskId IN (:...taskIds)',
          {
            taskIds:
              items.map(
                (
                  task,
                ) =>
                  task.id,
              ),
          },
        )
        .getMany();


    const ratingsByTaskId =
      new Map<
        string,
        TaskRatingEntity[]
      >();


    for (
      const rating
      of ratings
    ) {
      const list =
        ratingsByTaskId.get(
          rating.taskId,
        ) ??
        [];


      list.push(
        rating,
      );


      ratingsByTaskId.set(
        rating.taskId,
        list,
      );
    }


    for (
      const task
      of items
    ) {
      task.ratings =
        ratingsByTaskId.get(
          task.id,
        ) ??
        [];
    }
  }


  /*
   * ==========================================================
   * RESPONSE
   * ==========================================================
   */

  return {
    items,
    total,
    page,
    limit,
  };
}

  /*
   * ==========================================================
   * MY TASKS
   * ==========================================================
   */

  async findMyTasks(
    userId: string,
    query: QueryMyTasksDto,
  ) {
    const page =
      query.page ?? 1;

    const limit =
      query.limit ?? 20;

    const idQb =
      this.taskRepo
        .createQueryBuilder(
          'task',
        )
        .leftJoin(
          'task.assignments',
          'assignment',
        )
        .leftJoin(
          'task.ratings',
          'rating',
        )
        .select(
          'task.id',
          'id',
        )
        .addSelect(
          'task.deadlineDate',
          'deadlineDate',
        )
        .addSelect(
          'task.priority',
          'priority',
        )
        .addSelect(
          'AVG(rating.score)',
          'avgRating',
        )
        .where(
          '(task.assignedToId = :userId OR (assignment.assigneeId = :userId AND assignment.status != :rejectedStatus))',
          {
            userId,
            rejectedStatus:
              AssignmentStatus.REJECTED,
          },
        )
        .andWhere(
          'task.archivedAt IS NULL',
        )
        .groupBy(
          'task.id',
        );

    if (
      query.status
    ) {
      idQb.andWhere(
        'task.status = :status',
        {
          status:
            query.status,
        },
      );
    }

    if (
      query.taskType
    ) {
      idQb.andWhere(
        'task.taskType = :taskType',
        {
          taskType:
            query.taskType,
        },
      );
    }

    if (
      query.priority
    ) {
      idQb.andWhere(
        'task.priority = :priority',
        {
          priority:
            query.priority,
        },
      );
    }

    if (
      query.projectId
    ) {
      idQb.andWhere(
        'task.projectId = :projectId',
        {
          projectId:
            query.projectId,
        },
      );
    }

    if (
      query.search
    ) {
      idQb.andWhere(
        '(task.titleEn ILIKE :search OR task.titleAr ILIKE :search OR task.descriptionEn ILIKE :search OR task.descriptionAr ILIKE :search)',
        {
          search:
            `%${query.search}%`,
        },
      );
    }

    if (
      query.upcomingOnly ===
      'true'
    ) {
      idQb
        .andWhere(
          'task.deadlineDate IS NOT NULL',
        )
        .andWhere(
          'task.deadlineDate >= CURRENT_DATE',
        )
        .andWhere(
          'task.status NOT IN (:...doneStatuses)',
          {
            doneStatuses: [
              TaskStatus.COMPLETED,
              TaskStatus.FINISHED,
              TaskStatus.ARCHIVED,
            ],
          },
        );
    }

    if (
      query.deadlineFrom
    ) {
      idQb.andWhere(
        'task.deadlineDate >= :deadlineFrom',
        {
          deadlineFrom:
            query.deadlineFrom,
        },
      );
    }

    if (
      query.deadlineTo
    ) {
      idQb.andWhere(
        'task.deadlineDate <= :deadlineTo',
        {
          deadlineTo:
            query.deadlineTo,
        },
      );
    }

    if (
      query.minRating
    ) {
      idQb.having(
        'AVG(rating.score) >= :minRating',
        {
          minRating:
            Number(
              query.minRating,
            ),
        },
      );
    }

    const dir =
      query.sortDir ===
      'asc'
        ? 'ASC'
        : 'DESC';

    switch (
      query.sortBy
    ) {
      case 'priority':
        idQb.orderBy(
          `CASE task.priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END`,
          query.sortDir ===
          'desc'
            ? 'DESC'
            : 'ASC',
        );
        break;

      case 'rating':
        idQb.orderBy(
          '"avgRating"',
          dir,
        );
        break;

      case 'createdAt':
        idQb.orderBy(
          'task.createdAt',
          dir,
        );
        break;

      case 'deadline':
      default:
        idQb.orderBy(
          'task.deadlineDate',
          query.sortDir ===
          'desc'
            ? 'DESC'
            : 'ASC',
          'NULLS LAST',
        );
        break;
    }

    idQb.addOrderBy(
      'task.id',
      'ASC',
    );

    const rawRows =
      await idQb.getRawMany<{
        id: string;
      }>();

    const total =
      rawRows.length;

    const pageIds =
      rawRows
        .slice(
          (page - 1) *
            limit,
          (page - 1) *
            limit +
            limit,
        )
        .map(
          (row) =>
            row.id,
        );

    if (
      pageIds.length ===
      0
    ) {
      return {
        items: [],
        total,
        page,
        limit,
      };
    }

    const hydrated =
      await this.taskRepo.find({
        where: {
          id:
            In(
              pageIds,
            ),
        },

        relations: [
          'branch',
          'department',
          'project',
          'assignedTo',
          'createdBy',
          'ratings',
        ],
      });

    const byId =
      new Map(
        hydrated.map(
          (task) => [
            task.id,
            task,
          ],
        ),
      );

    const items =
      pageIds
        .map(
          (taskId) =>
            byId.get(
              taskId,
            ),
        )
        .filter(
          (
            task,
          ): task is TaskEntity =>
            Boolean(
              task,
            ),
        );

    return {
      items,
      total,
      page,
      limit,
    };
  }

  /*
   * ==========================================================
   * ASSIGNED BY ME
   * ==========================================================
   */

  async findAssignedByMe(
    userId: string,
    query: QueryMyTasksDto,
  ) {
    const page =
      query.page ?? 1;

    const limit =
      query.limit ?? 20;

    const idQb =
      this.taskRepo
        .createQueryBuilder(
          'task',
        )
        .leftJoin(
          'task.ratings',
          'rating',
        )
        .select(
          'task.id',
          'id',
        )
        .addSelect(
          'task.deadlineDate',
          'deadlineDate',
        )
        .addSelect(
          'task.priority',
          'priority',
        )
        .addSelect(
          'AVG(rating.score)',
          'avgRating',
        )
        .where(
          'task.createdById = :userId',
          {
            userId,
          },
        )
        .andWhere(
          '(task.assignedToId IS NULL OR task.assignedToId != :userId)',
          {
            userId,
          },
        )
        .andWhere(
          'task.archivedAt IS NULL',
        )
        .groupBy(
          'task.id',
        );

    if (
      query.status
    ) {
      idQb.andWhere(
        'task.status = :status',
        {
          status:
            query.status,
        },
      );
    }

    if (
      query.taskType
    ) {
      idQb.andWhere(
        'task.taskType = :taskType',
        {
          taskType:
            query.taskType,
        },
      );
    }

    if (
      query.priority
    ) {
      idQb.andWhere(
        'task.priority = :priority',
        {
          priority:
            query.priority,
        },
      );
    }

    if (
      query.projectId
    ) {
      idQb.andWhere(
        'task.projectId = :projectId',
        {
          projectId:
            query.projectId,
        },
      );
    }

    if (
      query.search
    ) {
      idQb.andWhere(
        '(task.titleEn ILIKE :search OR task.titleAr ILIKE :search OR task.descriptionEn ILIKE :search OR task.descriptionAr ILIKE :search)',
        {
          search:
            `%${query.search}%`,
        },
      );
    }

    if (
      query.upcomingOnly ===
      'true'
    ) {
      idQb
        .andWhere(
          'task.deadlineDate IS NOT NULL',
        )
        .andWhere(
          'task.deadlineDate >= CURRENT_DATE',
        )
        .andWhere(
          'task.status NOT IN (:...doneStatuses)',
          {
            doneStatuses: [
              TaskStatus.COMPLETED,
              TaskStatus.FINISHED,
              TaskStatus.ARCHIVED,
            ],
          },
        );
    }

    if (
      query.deadlineFrom
    ) {
      idQb.andWhere(
        'task.deadlineDate >= :deadlineFrom',
        {
          deadlineFrom:
            query.deadlineFrom,
        },
      );
    }

    if (
      query.deadlineTo
    ) {
      idQb.andWhere(
        'task.deadlineDate <= :deadlineTo',
        {
          deadlineTo:
            query.deadlineTo,
        },
      );
    }

    if (
      query.minRating
    ) {
      idQb.having(
        'AVG(rating.score) >= :minRating',
        {
          minRating:
            Number(
              query.minRating,
            ),
        },
      );
    }

    const dir =
      query.sortDir ===
      'asc'
        ? 'ASC'
        : 'DESC';

    switch (
      query.sortBy
    ) {
      case 'priority':
        idQb.orderBy(
          `CASE task.priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END`,
          query.sortDir ===
          'desc'
            ? 'DESC'
            : 'ASC',
        );
        break;

      case 'rating':
        idQb.orderBy(
          '"avgRating"',
          dir,
        );
        break;

      case 'createdAt':
        idQb.orderBy(
          'task.createdAt',
          dir,
        );
        break;

      case 'deadline':
      default:
        idQb.orderBy(
          'task.deadlineDate',
          query.sortDir ===
          'desc'
            ? 'DESC'
            : 'ASC',
          'NULLS LAST',
        );
        break;
    }

    idQb.addOrderBy(
      'task.id',
      'ASC',
    );

    const rawRows =
      await idQb.getRawMany<{
        id: string;
      }>();

    const total =
      rawRows.length;

    const pageIds =
      rawRows
        .slice(
          (page - 1) *
            limit,
          (page - 1) *
            limit +
            limit,
        )
        .map(
          (row) =>
            row.id,
        );

    if (
      pageIds.length ===
      0
    ) {
      return {
        items: [],
        total,
        page,
        limit,
      };
    }

    const hydrated =
      await this.taskRepo.find({
        where: {
          id:
            In(
              pageIds,
            ),
        },

        relations: [
          'branch',
          'department',
          'project',
          'assignedTo',
          'createdBy',
          'ratings',
        ],
      });

    const byId =
      new Map(
        hydrated.map(
          (task) => [
            task.id,
            task,
          ],
        ),
      );

    const items =
      pageIds
        .map(
          (taskId) =>
            byId.get(
              taskId,
            ),
        )
        .filter(
          (
            task,
          ): task is TaskEntity =>
            Boolean(
              task,
            ),
        );

    return {
      items,
      total,
      page,
      limit,
    };
  }

  /*
   * ==========================================================
   * GET ONE
   * ==========================================================
   */

  async findOne(
    id: string,
  ): Promise<TaskEntity> {
    const task =
      await this.taskRepo.findOne({
        where: {
          id,
        },

        relations:
          TASK_RELATIONS,
      });

    if (!task) {
      throw new NotFoundException(
        'Task not found',
      );
    }

    task.attachments =
      (
        task.attachments ||
        []
      ).filter(
        (attachment) =>
          !attachment.deletedAt,
      );

    task.comments =
      (
        task.comments ||
        []
      ).filter(
        (comment) =>
          !comment.deletedAt,
      );

    return task;
  }

  /*
   * ==========================================================
   * CREATE
   * ==========================================================
   */

  async create(
    dto: CreateTaskDto,
    actor: UserEntity,
  ): Promise<TaskEntity> {
    /*
     * Department is required and must be an active Department.
     */
    await this.assertActiveSettingById(
      SettingType.DEPARTMENT,
      dto.departmentId,
      'Department',
    );

    /*
     * Branch is optional but must be valid if supplied.
     */
    if (
      dto.branchId
    ) {
      await this.assertActiveSettingById(
        SettingType.BRANCH,
        dto.branchId,
        'Branch',
      );
    }

    /*
     * Project.
     */
    if (
      dto.projectId
    ) {
      await this.assertUsableProject(
        dto.projectId,
      );
    }

    /*
     * Dates.
     */
    this.assertValidDateRange(
      dto.startDate,
      dto.deadlineDate,
    );

    /*
     * Parent Task.
     */
    if (
      dto.parentTaskId
    ) {
      const parentTask =
        await this.taskRepo.findOne({
          where: {
            id:
              dto.parentTaskId,
          },
        });

      if (
        !parentTask
      ) {
        throw new NotFoundException(
          'Parent Task not found',
        );
      }

      if (
        parentTask.archivedAt ||
        parentTask.status ===
          TaskStatus.ARCHIVED
      ) {
        throw new BadRequestException(
          'Cannot attach a Sub-task to an archived Parent Task',
        );
      }

      if (
        dto.deadlineDate &&
        parentTask.deadlineDate &&
        dto.deadlineDate >
          parentTask.deadlineDate
      ) {
        throw new BadRequestException(
          "Sub-task deadline cannot exceed its Parent Task's deadline",
        );
      }
    }

    /*
     * Assignee.
     */
    if (
      dto.assignedToId
    ) {
      await this.assertValidAssignee(
        dto.assignedToId,
      );
    }

    /*
     * Approval.
     */
    const needsApproval =
      Boolean(
        dto.needsApproval,
      );

    if (
      needsApproval &&
      !dto.approverId
    ) {
      throw new BadRequestException(
        'An approver is required when the Task needs approval',
      );
    }

    if (
      needsApproval &&
      dto.approverId
    ) {
      await this.assertValidApprover(
        dto.approverId,
      );
    }

    this.assertAssigneeAndApproverDifferent(
      dto.assignedToId,
      needsApproval
        ? dto.approverId
        : undefined,
    );

    /*
     * Budget.
     */
    const needsBudget =
      Boolean(
        dto.needsBudget,
      );

    this.assertBudgetComplete(
      needsBudget,
      dto.budgetMin,
      dto.budgetMax,
    );

    /*
     * Type / priority.
     */
    if (
      dto.taskType
    ) {
      await this.assertValidListValue(
        SettingType.TASK_TYPE,
        dto.taskType,
        'Task Type',
      );
    }

    await this.assertValidListValue(
      SettingType.TASK_PRIORITY,
      dto.priority,
      'Priority',
    );

    /*
     * Save.
     */
    const task =
      await this.taskRepo.save(
        this.taskRepo.create({
          titleAr:
            dto.titleAr,

          titleEn:
            dto.titleEn,

          descriptionAr:
            dto.descriptionAr,

          descriptionEn:
            dto.descriptionEn,

          taskType:
            dto.taskType,

          priority:
            dto.priority,

          color:
            dto.color,

          branchId:
            dto.branchId,

          departmentId:
            dto.departmentId,

          projectId:
            dto.projectId,

          parentTaskId:
            dto.parentTaskId,

          assignedToId:
            dto.assignedToId,

          createdById:
            actor.id,

          needsApproval,

          approverId:
            needsApproval
              ? dto.approverId
              : undefined,

          approvalStatus:
            needsApproval
              ? ApprovalStatus.PENDING
              : ApprovalStatus.NOT_REQUIRED,

          needsBudget,

          budgetMin:
            needsBudget
              ? dto.budgetMin
              : undefined,

          budgetMax:
            needsBudget
              ? dto.budgetMax
              : undefined,

          budgetCurrency:
            needsBudget
              ? (
                  dto.budgetCurrency ??
                  'SAR'
                )
              : undefined,

          startDate:
            dto.startDate,

          deadlineDate:
            dto.deadlineDate,

          status:
            TaskStatus.PENDING,
        }),
      );

    /*
     * Audit.
     */
    await this.auditLogsService.record({
      actorId:
        actor.id,

      entityType:
        'Task',

      entityId:
        task.id,

      action:
        AuditAction.CREATE,

      newValue:
        task,
    });

    /*
     * The new Task may affect Project status.
     */
    if (
      task.projectId
    ) {
      await this.projectsService.recomputeStatus(
        task.projectId,
      );
    }

    return this.findOne(
      task.id,
    );
  }

  /*
   * ==========================================================
   * UPDATE
   * ==========================================================
   */

  async update(
    id: string,
    dto: UpdateTaskDto,
    actor: UserEntity,
  ): Promise<TaskEntity> {
    const task =
      await this.findOne(
        id,
      );

    const isAdmin =
      actor.role.name ===
      RoleName.ADMIN;

    /*
     * Permissions.
     */
    if (
      !isAdmin &&
      task.createdById !==
        actor.id
    ) {
      throw new ForbiddenException(
        'Only the Task creator or Admin may edit this Task',
      );
    }

    if (
      task.archivedAt ||
      task.status ===
        TaskStatus.ARCHIVED
    ) {
      throw new BadRequestException(
        'Cannot edit an archived Task',
      );
    }

    if (
      task.status ===
        TaskStatus.PENDING_APPROVAL &&
      !isAdmin
    ) {
      throw new ForbiddenException(
        'Task is pending approval and cannot be edited until a decision is made',
      );
    }

    /*
     * Effective values.
     */
    const effectiveStartDate =
      dto.startDate !==
      undefined
        ? dto.startDate
        : task.startDate ??
          null;

    const effectiveDeadline =
      dto.deadlineDate !==
      undefined
        ? dto.deadlineDate
        : task.deadlineDate ??
          null;

    const effectiveParentId =
      dto.parentTaskId !==
      undefined
        ? dto.parentTaskId
        : task.parentTaskId ??
          null;

    const effectiveAssigneeId =
      dto.assignedToId !==
      undefined
        ? dto.assignedToId
        : task.assignedToId ??
          null;

    const effectiveNeedsApproval =
      dto.needsApproval !==
      undefined
        ? dto.needsApproval
        : task.needsApproval;

    const effectiveApproverId =
      dto.approverId !==
      undefined
        ? dto.approverId
        : task.approverId ??
          null;

    const effectiveNeedsBudget =
      dto.needsBudget !==
      undefined
        ? dto.needsBudget
        : task.needsBudget;

    const effectiveBudgetMin =
      dto.budgetMin !==
      undefined
        ? dto.budgetMin
        : task.budgetMin ??
          null;

    const effectiveBudgetMax =
      dto.budgetMax !==
      undefined
        ? dto.budgetMax
        : task.budgetMax ??
          null;

    /*
     * Dates.
     */
    this.assertValidDateRange(
      effectiveStartDate,
      effectiveDeadline,
    );

    if (
      dto.deadlineDate &&
      task.deadlineDate &&
      dto.deadlineDate <
        task.deadlineDate
    ) {
      const today =
        new Date()
          .toISOString()
          .slice(
            0,
            10,
          );

      if (
        dto.deadlineDate <
          today &&
        !isAdmin
      ) {
        throw new ForbiddenException(
          'Moving the deadline earlier than today requires Admin override',
        );
      }
    }

    /*
     * Department.
     */
    if (
      dto.departmentId !==
      undefined
    ) {
      if (
        !dto.departmentId
      ) {
        throw new BadRequestException(
          'Department is required',
        );
      }

      await this.assertActiveSettingById(
        SettingType.DEPARTMENT,
        dto.departmentId,
        'Department',
      );
    }

    /*
     * Branch.
     */
    if (
      dto.branchId
    ) {
      await this.assertActiveSettingById(
        SettingType.BRANCH,
        dto.branchId,
        'Branch',
      );
    }

    /*
     * Project.
     */
    if (
      dto.projectId
    ) {
      await this.assertUsableProject(
        dto.projectId,
      );
    }

    /*
     * Parent Task.
     */
    if (
      effectiveParentId
    ) {
      await this.assertNoCircularReference(
        task.id,
        effectiveParentId,
      );

      const parent =
        await this.taskRepo.findOne({
          where: {
            id:
              effectiveParentId,
          },
        });

      if (
        !parent
      ) {
        throw new NotFoundException(
          'Parent Task not found',
        );
      }

      if (
        parent.archivedAt ||
        parent.status ===
          TaskStatus.ARCHIVED
      ) {
        throw new BadRequestException(
          'Cannot attach a Task to an archived Parent Task',
        );
      }

      if (
        parent.deadlineDate &&
        effectiveDeadline &&
        effectiveDeadline >
          parent.deadlineDate
      ) {
        throw new BadRequestException(
          "Sub-task deadline cannot exceed its Parent Task's deadline",
        );
      }
    }

    /*
     * Assignee.
     */
    if (
      effectiveAssigneeId
    ) {
      await this.assertValidAssignee(
        effectiveAssigneeId,
      );
    }

    /*
     * Approval.
     */
    const enablingApproval =
      dto.needsApproval ===
        true &&
      !task.needsApproval;

    if (
      enablingApproval &&
      (
        task.status ===
          TaskStatus.COMPLETED ||
        task.status ===
          TaskStatus.FINISHED
      )
    ) {
      throw new BadRequestException(
        'Cannot enable approval on a completed or finished Task',
      );
    }

    if (
      effectiveNeedsApproval &&
      !effectiveApproverId
    ) {
      throw new BadRequestException(
        'An approver is required when the Task needs approval',
      );
    }

    if (
      effectiveNeedsApproval &&
      effectiveApproverId
    ) {
      await this.assertValidApprover(
        effectiveApproverId,
      );
    }

    this.assertAssigneeAndApproverDifferent(
      effectiveAssigneeId,
      effectiveNeedsApproval
        ? effectiveApproverId
        : null,
    );

    /*
     * Budget.
     */
    this.assertBudgetComplete(
      effectiveNeedsBudget,
      effectiveBudgetMin,
      effectiveBudgetMax,
    );

    /*
     * Task Type / Priority.
     */
    if (
      dto.taskType
    ) {
      await this.assertValidListValue(
        SettingType.TASK_TYPE,
        dto.taskType,
        'Task Type',
      );
    }

    if (
      dto.priority
    ) {
      await this.assertValidListValue(
        SettingType.TASK_PRIORITY,
        dto.priority,
        'Priority',
      );
    }

    /*
     * Preserve values required for audit and project recalculation.
     */
    const oldValue = {
      ...task,
    };

    const oldProjectId =
      task.projectId;

    const oldApproverId =
      task.approverId;

    /*
     * Apply DTO.
     *
     * Object.assign intentionally keeps null values so nullable DB
     * columns can actually be cleared.
     */
    Object.assign(
      task,
      dto,
    );

    /*
     * Approval state.
     */
    if (
      dto.needsApproval ===
      false
    ) {
      task.needsApproval =
        false;

      task.approvalStatus =
        ApprovalStatus.NOT_REQUIRED;

      (
        task as any
      ).approverId =
        null;

      (
        task as any
      ).rejectionReason =
        null;
    } else if (
      effectiveNeedsApproval
    ) {
      task.needsApproval =
        true;

      /*
       * Approval has just been enabled.
       */
      if (
        !oldValue.needsApproval
      ) {
        task.approvalStatus =
          ApprovalStatus.PENDING;

        (
          task as any
        ).rejectionReason =
          null;
      }

      /*
       * Changing approver requires a new approval decision.
       */
      if (
        dto.approverId !==
          undefined &&
        effectiveApproverId !==
          oldApproverId
      ) {
        task.approvalStatus =
          ApprovalStatus.PENDING;

        (
          task as any
        ).rejectionReason =
          null;
      }
    }

    /*
     * Budget state.
     */
    if (
      dto.needsBudget ===
      false
    ) {
      task.needsBudget =
        false;

      (
        task as any
      ).budgetMin =
        null;

      (
        task as any
      ).budgetMax =
        null;

      (
        task as any
      ).budgetCurrency =
        null;
    }

    /*
     * Save.
     */
    const saved =
      await this.taskRepo.save(
        task,
      );

    /*
     * Audit.
     */
    await this.auditLogsService.record({
      actorId:
        actor.id,

      entityType:
        'Task',

      entityId:
        saved.id,

      action:
        AuditAction.UPDATE,

      oldValue,

      newValue:
        saved,
    });

    /*
     * Project moved from A -> B:
     * recalculate both projects.
     */
    if (
      oldProjectId &&
      oldProjectId !==
        saved.projectId
    ) {
      await this.projectsService.recomputeStatus(
        oldProjectId,
      );
    }

    if (
      saved.projectId
    ) {
      await this.projectsService.recomputeStatus(
        saved.projectId,
      );
    }

    return this.findOne(
      saved.id,
    );
  }

  /*
   * ==========================================================
   * ATTACHMENT PERMISSIONS
   * ==========================================================
   */

  async updateAttachmentPermissions(
    id: string,
    dto: UpdateAttachmentPermissionsDto,
    actor: UserEntity,
  ): Promise<TaskEntity> {
    const task =
      await this.findOne(
        id,
      );

    const isAdmin =
      actor.role.name ===
      RoleName.ADMIN;

    if (
      !isAdmin &&
      task.createdById !==
        actor.id
    ) {
      throw new ForbiddenException(
        'Only the Task creator or Admin may change attachment download permissions',
      );
    }

    const oldValue = {
      assigneeCanDownloadAttachments:
        task.assigneeCanDownloadAttachments,
    };

    await this.taskRepo.update(
      id,
      {
        assigneeCanDownloadAttachments:
          dto.assigneeCanDownloadAttachments,
      },
    );

    const saved =
      await this.findOne(
        id,
      );

    await this.auditLogsService.record({
      actorId:
        actor.id,

      entityType:
        'Task',

      entityId:
        saved.id,

      action:
        AuditAction.UPDATE,

      oldValue,

      newValue: {
        assigneeCanDownloadAttachments:
          saved.assigneeCanDownloadAttachments,
      },
    });

    return saved;
  }

  /*
   * ==========================================================
   * PARENT CYCLE CHECK
   * ==========================================================
   */

  private async assertNoCircularReference(
    taskId: string,
    newParentId: string,
  ): Promise<void> {
    if (
      taskId ===
      newParentId
    ) {
      throw new BadRequestException(
        'A Task cannot reference itself as its own parent',
      );
    }

    let currentId:
      | string
      | undefined =
      newParentId;

    const visited =
      new Set<string>();

    while (
      currentId
    ) {
      if (
        currentId ===
        taskId
      ) {
        throw new BadRequestException(
          'This change would create a circular Task hierarchy',
        );
      }

      if (
        visited.has(
          currentId,
        )
      ) {
        break;
      }

      visited.add(
        currentId,
      );

      const ancestor:
        | TaskEntity
        | null =
        await this.taskRepo.findOne({
          where: {
            id:
              currentId,
          },
        });

      currentId =
        ancestor?.parentTaskId;
    }
  }

  /*
   * ==========================================================
   * STATUS CHANGE
   * ==========================================================
   */

  async changeStatus(
    id: string,
    dto: UpdateTaskStatusDto,
    actor: UserEntity,
  ): Promise<TaskEntity> {
    const task =
      await this.findOne(
        id,
      );

    await this.assertCanChangeStatus(
      task,
      actor,
    );

    if (
      task.archivedAt
    ) {
      throw new BadRequestException(
        'Cannot change the status of an archived Task',
      );
    }

    await this.assertValidListValue(
      SettingType.TASK_STATUS,
      dto.status,
      'Status',
    );

    /*
     * Reopen.
     */
    if (
      dto.status ===
      TaskStatus.REOPENED
    ) {
      return this.reopen(
        task,
        dto.reason!,
        actor,
      );
    }

    /*
     * Finished is terminal for normal users.
     */
    if (
      task.status ===
        TaskStatus.FINISHED &&
      dto.status !==
        TaskStatus.ARCHIVED
    ) {
      if (
        actor.role.name !==
        RoleName.ADMIN
      ) {
        throw new ForbiddenException(
          'A Finished Task can only be reopened by Admin',
        );
      }
    }

    /*
     * Built-in workflow.
     */
    const fromIsBuiltIn =
      (
        Object.values(
          TaskStatus,
        ) as string[]
      ).includes(
        task.status,
      );

    const toIsBuiltIn =
      (
        Object.values(
          TaskStatus,
        ) as string[]
      ).includes(
        dto.status,
      );

    if (
      fromIsBuiltIn &&
      toIsBuiltIn
    ) {
      const allowedNext =
        ALLOWED_TRANSITIONS[
          task.status as TaskStatus
        ] ??
        [];

      if (
        !allowedNext.includes(
          dto.status as TaskStatus,
        )
      ) {
        if (
          task.status ===
            TaskStatus.COMPLETED &&
          dto.status ===
            TaskStatus.PENDING
        ) {
          throw new ConflictException(
            'A Completed Task cannot transition back to Pending',
          );
        }

        throw new ConflictException(
          `Cannot transition Task from ${task.status} to ${dto.status}`,
        );
      }
    }

    /*
     * Entering PendingApproval.
     */
    if (
      dto.status ===
      TaskStatus.PENDING_APPROVAL
    ) {
      if (
        !task.needsApproval
      ) {
        throw new ConflictException(
          'This Task does not require approval',
        );
      }

      if (
        !task.approverId
      ) {
        throw new BadRequestException(
          'This Task requires approval but has no approver',
        );
      }

      /*
       * Approver may have been deactivated since Task creation.
       */
      await this.assertValidApprover(
        task.approverId,
      );

      /*
       * Every resubmission starts a fresh approval attempt.
       */
      task.approvalStatus =
        ApprovalStatus.PENDING;

      (
        task as any
      ).rejectionReason =
        null;
    }

    /*
     * Completed.
     */
    if (
      dto.status ===
      TaskStatus.COMPLETED
    ) {
      if (
        task.needsApproval &&
        task.approvalStatus !==
          ApprovalStatus.APPROVED
      ) {
        throw new ConflictException(
          'This Task requires approval; route it through PendingApproval and have the approver decide first',
        );
      }

      await this.assertNoOpenSubTasks(
        task.id,
      );
    }

    /*
     * Finished requires a reason.
     */
    if (
      dto.status ===
        TaskStatus.FINISHED &&
      !dto.reason
    ) {
      throw new BadRequestException(
        'A reason is required to finish a Task',
      );
    }

    const oldValue = {
      status:
        task.status,

      approvalStatus:
        task.approvalStatus,
    };

    /*
     * Archive through status workflow.
     */
    if (
      dto.status ===
      TaskStatus.ARCHIVED
    ) {
      task.statusBeforeArchive =
        task.status;

      task.archivedAt =
        new Date();
    }

    task.status =
      dto.status;

    if (
      dto.status ===
      TaskStatus.COMPLETED
    ) {
      task.actualEndDate =
        new Date();
    }

    const saved =
      await this.taskRepo.save(
        task,
      );

    await this.auditLogsService.record({
      actorId:
        actor.id,

      entityType:
        'Task',

      entityId:
        saved.id,

      action:
        AuditAction.STATUS_CHANGE,

      oldValue,

      newValue: {
        status:
          saved.status,

        approvalStatus:
          saved.approvalStatus,
      },

      reason:
        dto.reason,
    });

    if (
      saved.projectId
    ) {
      await this.projectsService.recomputeStatus(
        saved.projectId,
      );
    }

    return this.findOne(
      saved.id,
    );
  }

  /*
   * ==========================================================
   * APPROVAL
   * ==========================================================
   */

  async decideApproval(
    id: string,
    dto: DecideTaskApprovalDto,
    actor: UserEntity,
  ): Promise<TaskEntity> {
    const task =
      await this.findOne(
        id,
      );

    if (
      !task.needsApproval
    ) {
      throw new BadRequestException(
        'This Task does not require approval',
      );
    }

    /*
     * Only configured Approver or Admin.
     */
    if (
      actor.role.name !==
        RoleName.ADMIN &&
      task.approverId !==
        actor.id
    ) {
      throw new ForbiddenException(
        'Only the designated approver or Admin may decide on this Task',
      );
    }

    /*
     * Approval can ONLY happen after submission for approval.
     */
    if (
      task.status !==
      TaskStatus.PENDING_APPROVAL
    ) {
      throw new ConflictException(
        'This Task is not currently awaiting approval',
      );
    }

    if (
      task.approvalStatus !==
      ApprovalStatus.PENDING
    ) {
      throw new ConflictException(
        'This approval request has already been decided',
      );
    }

    /*
     * Approval completes the Task.
     * Therefore all child Tasks must also be done.
     */
    if (
      dto.approve
    ) {
      await this.assertNoOpenSubTasks(
        task.id,
      );
    }

    const oldValue = {
      approvalStatus:
        task.approvalStatus,

      status:
        task.status,
    };

    if (
      dto.approve
    ) {
      task.approvalStatus =
        ApprovalStatus.APPROVED;

      (
        task as any
      ).rejectionReason =
        null;

      task.status =
        TaskStatus.COMPLETED;

      task.actualEndDate =
        new Date();
    } else {
      task.approvalStatus =
        ApprovalStatus.REJECTED;

      task.rejectionReason =
        dto.rejectionReason;

      /*
       * Send rejected work back for changes.
       */
      task.status =
        TaskStatus.IN_PROGRESS;

      (
        task as any
      ).actualEndDate =
        null;
    }

    const saved =
      await this.taskRepo.save(
        task,
      );

    await this.auditLogsService.record({
      actorId:
        actor.id,

      entityType:
        'Task',

      entityId:
        saved.id,

      action:
        dto.approve
          ? AuditAction.APPROVE
          : AuditAction.REJECT,

      oldValue,

      newValue: {
        approvalStatus:
          saved.approvalStatus,

        status:
          saved.status,
      },

      reason:
        dto.rejectionReason,
    });

    if (
      saved.projectId
    ) {
      await this.projectsService.recomputeStatus(
        saved.projectId,
      );
    }

    return this.findOne(
      saved.id,
    );
  }

  /*
   * ==========================================================
   * STATUS PERMISSION
   * ==========================================================
   */

  private async assertCanChangeStatus(
    task: TaskEntity,
    actor: UserEntity,
  ): Promise<void> {
    if (
      actor.role.name ===
        RoleName.ADMIN ||
      task.createdById ===
        actor.id
    ) {
      return;
    }

    if (
      task.assignedToId ===
      actor.id
    ) {
      return;
    }

    const isAssignee =
      await this.assignmentRepo.exist({
        where: {
          taskId:
            task.id,

          assigneeId:
            actor.id,
        },
      });

    if (
      !isAssignee
    ) {
      throw new ForbiddenException(
        'Only the assigned User(s), the Task creator, or Admin may change status',
      );
    }
  }

  /*
   * ==========================================================
   * REOPEN
   * ==========================================================
   */

  private async reopen(
    task: TaskEntity,
    reason: string,
    actor: UserEntity,
  ): Promise<TaskEntity> {
    if (
      actor.role.name !==
      RoleName.ADMIN
    ) {
      throw new ForbiddenException(
        'Only Admin may reopen a Task',
      );
    }

    if (
      task.status !==
        TaskStatus.COMPLETED &&
      task.status !==
        TaskStatus.FINISHED
    ) {
      throw new ConflictException(
        'Only a Completed or Finished Task can be reopened',
      );
    }

    const oldValue = {
      status:
        task.status,
    };

    task.status =
      TaskStatus.REOPENED;

    /*
     * A reopened task is no longer actually finished.
     */
    (
      task as any
    ).actualEndDate =
      null;

    const saved =
      await this.taskRepo.save(
        task,
      );

    await this.auditLogsService.record({
      actorId:
        actor.id,

      entityType:
        'Task',

      entityId:
        saved.id,

      action:
        AuditAction.STATUS_CHANGE,

      oldValue,

      newValue: {
        status:
          saved.status,
      },

      reason,
    });

    if (
      saved.projectId
    ) {
      await this.projectsService.recomputeStatus(
        saved.projectId,
      );
    }

    return this.findOne(
      saved.id,
    );
  }

  /*
   * ==========================================================
   * DELETE / ARCHIVE
   * ==========================================================
   */

  async remove(
    id: string,
    actor: UserEntity,
    hardDelete = false,
  ): Promise<void> {
    const task =
      await this.findOne(
        id,
      );

    const projectId =
      task.projectId;

    /*
     * Permanent delete.
     */
    if (
      hardDelete
    ) {
      if (
        actor.role.name !==
        RoleName.ADMIN
      ) {
        throw new ForbiddenException(
          'Only Admin may permanently delete a Task',
        );
      }

      const [
        assignments,
        comments,
        attachments,
        ratings,
      ] =
        await Promise.all([
          this.assignmentRepo.count({
            where: {
              taskId:
                id,
            },
          }),

          this.commentRepo.count({
            where: {
              taskId:
                id,
            },
          }),

          this.attachmentRepo.count({
            where: {
              taskId:
                id,
            },
          }),

          this.ratingRepo.count({
            where: {
              taskId:
                id,
            },
          }),
        ]);

      if (
        assignments +
          comments +
          attachments +
          ratings >
        0
      ) {
        throw new BadRequestException(
          'Cannot permanently delete a Task that has Assignments, Comments, Attachments, or Ratings',
        );
      }

      await this.taskRepo.remove(
        task,
      );

      await this.auditLogsService.record({
        actorId:
          actor.id,

        entityType:
          'Task',

        entityId:
          id,

        action:
          AuditAction.DELETE,

        reason:
          'Hard delete',
      });

      if (
        projectId
      ) {
        await this.projectsService.recomputeStatus(
          projectId,
        );
      }

      return;
    }

    /*
     * Soft delete / archive.
     */
    if (
      actor.role.name !==
        RoleName.ADMIN &&
      task.createdById !==
        actor.id
    ) {
      throw new ForbiddenException(
        'Only the Task creator or Admin may archive this Task',
      );
    }

    if (
      task.status ===
      TaskStatus.ARCHIVED
    ) {
      return;
    }

    task.statusBeforeArchive =
      task.status;

    task.archivedAt =
      new Date();

    task.status =
      TaskStatus.ARCHIVED;

    await this.taskRepo.save(
      task,
    );

    await this.auditLogsService.record({
      actorId:
        actor.id,

      entityType:
        'Task',

      entityId:
        id,

      action:
        AuditAction.ARCHIVE,
    });

    if (
      projectId
    ) {
      await this.projectsService.recomputeStatus(
        projectId,
      );
    }
  }

  /*
   * ==========================================================
   * UNARCHIVE
   * ==========================================================
   */

  async unarchive(
    id: string,
    actor: UserEntity,
  ): Promise<TaskEntity> {
    if (
      actor.role.name !==
      RoleName.ADMIN
    ) {
      throw new ForbiddenException(
        'Only Admin may unarchive a Task',
      );
    }

    const task =
      await this.findOne(
        id,
      );

    if (
      task.status !==
      TaskStatus.ARCHIVED
    ) {
      throw new ConflictException(
        'Only an Archived Task can be unarchived',
      );
    }

    const oldValue = {
      status:
        task.status,

      archivedAt:
        task.archivedAt,
    };

    task.status =
      task.statusBeforeArchive ??
      TaskStatus.PENDING;

    task.archivedAt =
      undefined;

    task.statusBeforeArchive =
      undefined;

    const saved =
      await this.taskRepo.save(
        task,
      );

    await this.auditLogsService.record({
      actorId:
        actor.id,

      entityType:
        'Task',

      entityId:
        saved.id,

      action:
        AuditAction.RESTORE,

      oldValue,

      newValue: {
        status:
          saved.status,
      },
    });

    if (
      saved.projectId
    ) {
      await this.projectsService.recomputeStatus(
        saved.projectId,
      );
    }

    return this.findOne(
      saved.id,
    );
  }
}