import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { appError } from '../../common/errors/app-error';

import {
  InjectRepository,
} from '@nestjs/typeorm';

import {
  In,
  Repository,
} from 'typeorm';

import {
  TaskEntity,
} from './entities/task.entity';

import {
  ProjectEntity,
} from '../projects/entities/project.entity';

import {
  SettingEntity,
} from '../settings/entities/setting.entity';

import {
  UserEntity,
} from '../users/entities/user.entity';

import {
  TaskAssignmentEntity,
} from '../task-assignments/entities/task-assignment.entity';

import {
  TaskCommentEntity,
} from '../task-comments/entities/task-comment.entity';

import {
  TaskAttachmentEntity,
} from '../task-attachments/entities/task-attachment.entity';

import {
  TaskRatingEntity,
} from '../task-ratings/entities/task-rating.entity';

import {
  CreateTaskDto,
  DecideTaskApprovalDto,
  QueryMyTasksDto,
  QueryTasksDto,
  UpdateAttachmentPermissionsDto,
  UpdateTaskDto,
  UpdateTaskStatusDto,
} from './dto/task.dto';

import {
  AuditLogsService,
} from '../audit-logs/audit-logs.service';

import {
  ProjectsService,
} from '../projects/projects.service';

import {
  TaskWorkflowService,
} from '../task-workflow/task-workflow.service';

import {
  TaskStatus,
} from '../../shared/enums/task-status.enum';

import {
  ProjectStatus,
} from '../../shared/enums/project-status.enum';

import {
  AuditAction,
} from '../../shared/enums/audit-action.enum';

import {
  RoleName,
} from '../../shared/enums/role.enum';

import {
  ApprovalStatus,
} from '../../shared/enums/approval-status.enum';

import {
  SettingType,
} from '../../shared/enums/setting-type.enum';

import {
  AssignmentStatus,
} from '../../shared/enums/assignment-status.enum';


/*
 * ============================================================
 * BUILT-IN TASK WORKFLOW
 * ============================================================
 */

const ALLOWED_TRANSITIONS:
  Record<
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

  [TaskStatus.ARCHIVED]:
    [],
};


/*
 * ============================================================
 * TASK DETAIL RELATIONS
 * ============================================================
 */

const TASK_RELATIONS = [
  'branch',
  'department',
  'project',

  'assignedTo',
  'createdBy',
  'approver',

  'parentTask',
  'parentTask.assignedTo',
  'parentTask.createdBy',

  'subTasks',
  'subTasks.assignedTo',
  'subTasks.createdBy',

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
    @InjectRepository(
      TaskEntity,
    )
    private readonly taskRepo:
      Repository<TaskEntity>,

    @InjectRepository(
      ProjectEntity,
    )
    private readonly projectRepo:
      Repository<ProjectEntity>,

    @InjectRepository(
      SettingEntity,
    )
    private readonly settingRepo:
      Repository<SettingEntity>,

    @InjectRepository(
      UserEntity,
    )
    private readonly userRepo:
      Repository<UserEntity>,

    @InjectRepository(
      TaskAssignmentEntity,
    )
    private readonly assignmentRepo:
      Repository<TaskAssignmentEntity>,

    @InjectRepository(
      TaskCommentEntity,
    )
    private readonly commentRepo:
      Repository<TaskCommentEntity>,

    @InjectRepository(
      TaskAttachmentEntity,
    )
    private readonly attachmentRepo:
      Repository<TaskAttachmentEntity>,

    @InjectRepository(
      TaskRatingEntity,
    )
    private readonly ratingRepo:
      Repository<TaskRatingEntity>,

    private readonly auditLogsService:
      AuditLogsService,

    private readonly projectsService:
      ProjectsService,

    private readonly taskWorkflowService:
      TaskWorkflowService,
  ) {}


  /*
   * ==========================================================
   * VALIDATION HELPERS
   * ==========================================================
   */

  private async assertValidListValue(
    type:
      SettingType,

    key:
      string,

    label:
      string,
  ):
    Promise<void> {
    const row =
      await this.settingRepo.findOne({
        where: {
          type,
          key,
          isActive:
            true,
        },
      });


    if (
      !row
    ) {
      throw new BadRequestException(
        appError('VALUE_NOT_VALID_ACTIVE_VALUE', `"${key}" is not a valid, active ${label}`),
      );
    }
  }


  private async assertActiveSettingById(
    type:
      SettingType,

    id:
      string,

    label:
      string,
  ):
    Promise<SettingEntity> {
    const setting =
      await this.settingRepo.findOne({
        where: {
          id,
          type,
        },
      });


    if (
      !setting
    ) {
      throw new BadRequestException(
        appError('VALUE_INVALID', `${label} is invalid`),
      );
    }


    if (
      !setting.isActive
    ) {
      throw new BadRequestException(
        appError('VALUE_INACTIVE', `${label} is inactive`),
      );
    }


    return setting;
  }


  private async assertUsableProject(
    projectId:
      string,
  ):
    Promise<ProjectEntity> {
    const project =
      await this.projectRepo.findOne({
        where: {
          id:
            projectId,
        },
      });


    if (
      !project
    ) {
      throw new NotFoundException(
        appError('PROJECT_NOT_FOUND', 'Project not found'),
      );
    }


    if (
      project.status ===
      ProjectStatus.ARCHIVED
    ) {
      throw new BadRequestException(
        appError('CANNOT_USE_ARCHIVED_PROJECT', 'Cannot use an archived Project'),
      );
    }


    return project;
  }


  private async assertValidAssignee(
    userId:
      string,
  ):
    Promise<UserEntity> {
    const assignee =
      await this.userRepo.findOne({
        where: {
          id:
            userId,
        },

        relations: [
          'role',
        ],
      });


    if (
      !assignee
    ) {
      throw new NotFoundException(
        appError('ASSIGNED_USER_NOT_FOUND', 'Assigned User not found'),
      );
    }


    if (
      !assignee.isActive
    ) {
      throw new BadRequestException(
        appError('CANNOT_ASSIGN_TASK_DEACTIVATED_USER', 'Cannot assign a Task to a deactivated User'),
      );
    }


    return assignee;
  }


  private async assertValidApprover(
    userId:
      string,
  ):
    Promise<UserEntity> {
    const approver =
      await this.userRepo.findOne({
        where: {
          id:
            userId,
        },

        relations: [
          'role',
        ],
      });


    if (
      !approver
    ) {
      throw new NotFoundException(
        appError('APPROVER_NOT_FOUND', 'Approver not found'),
      );
    }


    if (
      !approver.isActive
    ) {
      throw new BadRequestException(
        appError('CANNOT_USE_DEACTIVATED_USER_AS_APPROVER', 'Cannot use a deactivated User as the approver'),
      );
    }


    return approver;
  }


  private assertAssigneeAndApproverDifferent(
    assignedToId?:
      string | null,

    approverId?:
      string | null,
  ):
    void {
    if (
      assignedToId &&
      approverId &&
      assignedToId ===
        approverId
    ) {
      throw new BadRequestException(
        appError('TASK_ASSIGNEE_APPROVER_CANNOT_SAME_USER', 'The Task assignee and approver cannot be the same User'),
      );
    }
  }


  private assertValidDateRange(
    startDate?:
      string | null,

    deadlineDate?:
      string | null,
  ):
    void {
    if (
      startDate &&
      deadlineDate &&
      deadlineDate <
        startDate
    ) {
      throw new BadRequestException(
        appError('TASK_DEADLINE_CANNOT_BEFORE_START_DATE', 'Task deadline cannot be before the start date'),
      );
    }
  }


  private assertValidBudgetRange(
    minimum?:
      string | null,

    maximum?:
      string | null,
  ):
    void {
    if (
      minimum !==
        undefined &&
      minimum !==
        null &&
      maximum !==
        undefined &&
      maximum !==
        null &&
      Number(
        minimum,
      ) >
        Number(
          maximum,
        )
    ) {
      throw new BadRequestException(
        appError('MONEY_RANGE_MINIMUM_CANNOT_EXCEED_MAXIMUM', 'Money range minimum cannot exceed the maximum'),
      );
    }
  }


  private assertBudgetComplete(
    needsBudget:
      boolean,

    minimum?:
      string | null,

    maximum?:
      string | null,
  ):
    void {
    if (
      !needsBudget
    ) {
      return;
    }


    if (
      minimum ===
        undefined ||
      minimum ===
        null ||
      minimum ===
        '' ||
      maximum ===
        undefined ||
      maximum ===
        null ||
      maximum ===
        ''
    ) {
      throw new BadRequestException(
        appError('BUDGET_MINIMUM_MAXIMUM_REQUIRED_WHEN_TASK_NEEDS_BUDGET', 'Budget minimum and maximum are required when the Task needs a budget'),
      );
    }


    this.assertValidBudgetRange(
      minimum,
      maximum,
    );
  }


  /*
   * ==========================================================
   * SUBTASK CREATION PERMISSION
   * ==========================================================
   */

  private async assertCanCreateSubTask(
    parentTask:
      TaskEntity,

    actor:
      UserEntity,
  ):
    Promise<void> {
    if (
      parentTask.parentTaskId
    ) {
      throw new BadRequestException(
        appError('ONLY_ONE_LEVEL_SUB_TASKS_SUPPORTED', 'Only one level of Sub-tasks is supported'),
      );
    }


    if (
      parentTask.archivedAt ||
      [
        TaskStatus.COMPLETED,
        TaskStatus.FINISHED,
        TaskStatus.ARCHIVED,
      ].includes(
        parentTask.status as
          TaskStatus,
      )
    ) {
      throw new BadRequestException(
        appError('CANNOT_ADD_SUB_TASKS_COMPLETED_FINISHED_ARCHIVED_PARENT_TASK', 'Cannot add Sub-tasks to a completed, finished, or archived Parent Task'),
      );
    }


    if (
      actor.role.name ===
      RoleName.ADMIN
    ) {
      return;
    }


    if (
      parentTask.createdById ===
      actor.id
    ) {
      return;
    }


    const acceptedAssignment =
      await this.assignmentRepo.findOne({
        where: {
          taskId:
            parentTask.id,

          assigneeId:
            actor.id,

          status:
            AssignmentStatus.ACCEPTED,
        },
      });


    if (
      acceptedAssignment
    ) {
      return;
    }


    throw new ForbiddenException(
      appError('ONLY_PARENT_TASK_CREATOR_ADMIN_USER_WHO_ACCEPTED_PARENT_TASK_MAY_CREATE_SUB_TASKS', 'Only the Parent Task creator, Admin, or the User who accepted the Parent Task may create Sub-tasks'),
    );
  }


  /*
   * ==========================================================
   * OPEN SUBTASK GUARD
   * ==========================================================
   */

  private async assertNoOpenSubTasks(
    taskId:
      string,
  ):
    Promise<void> {
    const subTasks =
      await this.taskRepo.find({
        where: {
          parentTaskId:
            taskId,
        },
      });


    if (
      subTasks.length ===
      0
    ) {
      return;
    }


    const openSubTasks =
      subTasks.filter(
        (
          subTask,
        ) =>
          ![
            TaskStatus.COMPLETED,
            TaskStatus.FINISHED,
            TaskStatus.ARCHIVED,
          ].includes(
            subTask.status as
              TaskStatus,
          ),
      );


    if (
      openSubTasks.length >
      0
    ) {
      throw new ConflictException(
        appError('CANNOT_COMPLETE_PARENT_TASK_WHILE_VALUE_SUB_TASK_S_STILL_OPEN', `Cannot complete this Parent Task while ${openSubTasks.length} Sub-task(s) are still open`),
      );
    }
  }


  /*
   * ==========================================================
   * ALL TASKS
   * ==========================================================
   */

  async findAll(
    query:
      QueryTasksDto,
  ) {
    const page =
      query.page ??
      1;


    const limit =
      query.limit ??
      20;


    if (
      query.dueDateFrom &&
      query.dueDateTo &&
      query.dueDateTo <
        query.dueDateFrom
    ) {
      throw new BadRequestException(
        appError('DEADLINE_DATE_CANNOT_BEFORE_FROM_DATE', 'Deadline "to" date cannot be before the "from" date'),
      );
    }


    if (
      query.startDateFrom &&
      query.startDateTo &&
      query.startDateTo <
        query.startDateFrom
    ) {
      throw new BadRequestException(
        appError('START_DATE_CANNOT_BEFORE_FROM_DATE', 'Start date "to" cannot be before the "from" date'),
      );
    }


    if (
      query.createdDateFrom &&
      query.createdDateTo &&
      query.createdDateTo <
        query.createdDateFrom
    ) {
      throw new BadRequestException(
        appError('CREATED_DATE_CANNOT_BEFORE_FROM_DATE', 'Created date "to" cannot be before the "from" date'),
      );
    }


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


    if (
      query.search?.trim()
    ) {
      const search =
        `%${query.search.trim()}%`;


      qb.andWhere(
        `(
          task.title LIKE :search
          OR task.description LIKE :search
          OR createdBy.fullName LIKE :search
          OR assignedTo.fullName LIKE :search
          OR project.name LIKE :search
        )`,
        {
          search,
        },
      );
    }


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


    if (
  query.createdDateTo
) {
  qb.andWhere(
    `
      task.createdAt <
      DATE_ADD(
        CAST(:createdDateTo AS DATE),
        INTERVAL 1 DAY
      )
    `,
    {
      createdDateTo:
        query.createdDateTo,
    },
  );
}


    const sortColumns:
      Record<
        string,
        string
      > = {
      createdAt:
        'task.createdAt',

      deadline:
        'task.deadlineDate',

      startDate:
        'task.startDate',

      title:
        'task.title',

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


    qb.orderBy(
      sortColumn,
      sortDirection,
    );

    if (
      sortColumn !==
      'task.createdAt'
    ) {
      qb.addOrderBy(
        'task.createdAt',
        'DESC',
      );
    }

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


    const [
      items,
      total,
    ] =
      await qb.getManyAndCount();


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
  userId:
    string,

  query:
    QueryMyTasksDto,
) {
  const page =
    query.page ??
    1;


  const limit =
    query.limit ??
    20;


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
        'task.createdAt',
        'createdAt',
      )
      .addSelect(
        'AVG(rating.score)',
        'avgRating',
      )
      .where(
        `(
          task.assignedToId = :userId
          OR
          (
            assignment.assigneeId = :userId
            AND assignment.status != :rejectedStatus
          )
        )`,
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
      )
      .addGroupBy(
        'task.deadlineDate',
      )
      .addGroupBy(
        'task.priority',
      )
      .addGroupBy(
        'task.createdAt',
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
    query.search?.trim()
  ) {
    idQb.andWhere(
      `(
        task.title LIKE :search
        OR task.description LIKE :search
      )`,
      {
        search:
          `%${query.search.trim()}%`,
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
        'task.deadlineDate >= CURRENT_DATE()',
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
    query.overdueOnly ===
      'true'
  ) {
    idQb.andWhere('task.deadlineDate IS NOT NULL')
      .andWhere('task.deadlineDate < CURRENT_DATE')
      .andWhere(
        'task.status NOT IN (:...overdueDoneStatuses)',
        { overdueDoneStatuses: [TaskStatus.COMPLETED, TaskStatus.FINISHED, TaskStatus.ARCHIVED] },
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


  const sortBy =
    query.sortBy ??
    'deadline';


  const sortDir =
    query.sortDir ===
      'desc'
      ? 'DESC'
      : 'ASC';


  switch (
    sortBy
  ) {
    case 'priority':
      /*
       * ASC:
       * Low -> Medium -> High -> Critical
       *
       * DESC:
       * Critical -> High -> Medium -> Low
       */
      idQb.orderBy(
        `
          CASE task.priority
            WHEN 'Low' THEN 1
            WHEN 'Medium' THEN 2
            WHEN 'High' THEN 3
            WHEN 'Critical' THEN 4
            ELSE 0
          END
        `,
        sortDir,
      );

      break;


    case 'rating':
      /*
       * Ratings without a value go last.
       */
      idQb.orderBy(
        `
          CASE
            WHEN AVG(rating.score) IS NULL
            THEN 1
            ELSE 0
          END
        `,
        'ASC',
      );

      idQb.addOrderBy(
        'AVG(rating.score)',
        sortDir,
      );

      break;


    case 'createdAt':
      idQb.orderBy(
        'task.createdAt',
        sortDir,
      );

      break;


    case 'deadline':
    default:
      /*
       * MySQL / MariaDB replacement for NULLS LAST.
       */
      idQb.orderBy(
        `
          CASE
            WHEN task.deadlineDate IS NULL
            THEN 1
            ELSE 0
          END
        `,
        'ASC',
      );

      idQb.addOrderBy(
        'task.deadlineDate',
        sortDir,
      );

      break;
  }


  idQb.addOrderBy(
    'task.createdAt',
    'DESC',
  );


  idQb.addOrderBy(
    'task.id',
    'ASC',
  );


  const rawRows =
    await idQb.getRawMany<{
      id:
        string;
    }>();


  const total =
    rawRows.length;


  const pageIds =
    rawRows
      .slice(
        (
          page -
          1
        ) *
          limit,

        (
          page -
          1
        ) *
          limit +
          limit,
      )
      .map(
        (
          row,
        ) =>
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
        (
          task,
        ) => [
          task.id,
          task,
        ],
      ),
    );


  const items =
    pageIds
      .map(
        (
          taskId,
        ) =>
          byId.get(
            taskId,
          ),
      )
      .filter(
        (
          task,
        ):
          task is TaskEntity =>
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
   *
   * NEW:
   *
   * - optional current-assignee filter
   * - default newest-created first
   * ==========================================================
   */

  async findAssignedByMe(
  userId:
    string,

  query:
    QueryMyTasksDto,
) {
  const page =
    query.page ??
    1;


  const limit =
    query.limit ??
    20;


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
        'task.createdAt',
        'createdAt',
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
        `(
          task.assignedToId IS NULL
          OR task.assignedToId != :userId
        )`,
        {
          userId,
        },
      )
      .andWhere(
        'task.archivedAt IS NULL',
      )
      .groupBy(
        'task.id',
      )
      .addGroupBy(
        'task.deadlineDate',
      )
      .addGroupBy(
        'task.priority',
      )
      .addGroupBy(
        'task.createdAt',
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
    query.assigneeId
  ) {
    idQb.andWhere(
      'task.assignedToId = :assigneeId',
      {
        assigneeId:
          query.assigneeId,
      },
    );
  }


  if (
    query.search?.trim()
  ) {
    idQb.andWhere(
      `(
        task.title LIKE :search
        OR task.description LIKE :search
      )`,
      {
        search:
          `%${query.search.trim()}%`,
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
        'task.deadlineDate >= CURRENT_DATE()',
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


  /*
   * Assigned By Me defaults to newest first.
   */
  const effectiveSortBy =
    query.sortBy ??
    'createdAt';


  const effectiveSortDir =
    query.sortDir ===
      'asc'
      ? 'ASC'
      : 'DESC';


  switch (
    effectiveSortBy
  ) {
    case 'priority':
      idQb.orderBy(
        `
          CASE task.priority
            WHEN 'Low' THEN 1
            WHEN 'Medium' THEN 2
            WHEN 'High' THEN 3
            WHEN 'Critical' THEN 4
            ELSE 0
          END
        `,
        effectiveSortDir,
      );

      break;


    case 'rating':
      idQb.orderBy(
        `
          CASE
            WHEN AVG(rating.score) IS NULL
            THEN 1
            ELSE 0
          END
        `,
        'ASC',
      );

      idQb.addOrderBy(
        'AVG(rating.score)',
        effectiveSortDir,
      );

      break;


    case 'deadline':
      idQb.orderBy(
        `
          CASE
            WHEN task.deadlineDate IS NULL
            THEN 1
            ELSE 0
          END
        `,
        'ASC',
      );

      idQb.addOrderBy(
        'task.deadlineDate',
        effectiveSortDir,
      );

      break;


    case 'createdAt':
    default:
      idQb.orderBy(
        'task.createdAt',
        effectiveSortDir,
      );

      break;
  }


  idQb.addOrderBy(
    'task.id',
    'DESC',
  );


  const rawRows =
    await idQb.getRawMany<{
      id:
        string;
    }>();


  const total =
    rawRows.length;


  const pageIds =
    rawRows
      .slice(
        (
          page -
          1
        ) *
          limit,

        (
          page -
          1
        ) *
          limit +
          limit,
      )
      .map(
        (
          row,
        ) =>
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
        (
          task,
        ) => [
          task.id,
          task,
        ],
      ),
    );


  const items =
    pageIds
      .map(
        (
          taskId,
        ) =>
          byId.get(
            taskId,
          ),
      )
      .filter(
        (
          task,
        ):
          task is TaskEntity =>
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
    id:
      string,
  ):
    Promise<TaskEntity> {
    const task =
      await this.taskRepo.findOne({
        where: {
          id,
        },

        relations:
          TASK_RELATIONS,
      });


    if (
      !task
    ) {
      throw new NotFoundException(
        appError('TASK_NOT_FOUND', 'Task not found'),
      );
    }


    task.attachments =
      (
        task.attachments ||
        []
      ).filter(
        (
          attachment,
        ) =>
          !attachment.deletedAt,
      );


    task.comments =
      (
        task.comments ||
        []
      ).filter(
        (
          comment,
        ) =>
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
    dto:
      CreateTaskDto,

    actor:
      UserEntity,
  ):
    Promise<TaskEntity> {
    await this.assertActiveSettingById(
      SettingType.DEPARTMENT,
      dto.departmentId,
      'Department',
    );


    if (
      dto.branchId
    ) {
      await this.assertActiveSettingById(
        SettingType.BRANCH,
        dto.branchId,
        'Branch',
      );
    }


    if (
      dto.projectId
    ) {
      await this.assertUsableProject(
        dto.projectId,
      );
    }


    this.assertValidDateRange(
      dto.startDate,
      dto.deadlineDate,
    );


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
          appError('PARENT_TASK_NOT_FOUND', 'Parent Task not found'),
        );
      }


      await this.assertCanCreateSubTask(
        parentTask,
        actor,
      );


      if (
        dto.departmentId !==
        parentTask.departmentId
      ) {
        throw new BadRequestException(
          appError('SUB_TASK_DEPARTMENT_MUST_MATCH_PARENT_TASK', 'Sub-task Department must match its Parent Task'),
        );
      }


      if (
        (
          dto.branchId ??
          null
        ) !==
        (
          parentTask.branchId ??
          null
        )
      ) {
        throw new BadRequestException(
          appError('SUB_TASK_BRANCH_MUST_MATCH_PARENT_TASK', 'Sub-task Branch must match its Parent Task'),
        );
      }


      if (
        (
          dto.projectId ??
          null
        ) !==
        (
          parentTask.projectId ??
          null
        )
      ) {
        throw new BadRequestException(
          appError('SUB_TASK_PROJECT_MUST_MATCH_PARENT_TASK', 'Sub-task Project must match its Parent Task'),
        );
      }


      if (
        dto.startDate &&
        parentTask.startDate &&
        dto.startDate <
          parentTask.startDate
      ) {
        throw new BadRequestException(
          appError('SUB_TASK_START_DATE_CANNOT_BEFORE_PARENT_TASK_S_START_DATE', "Sub-task start date cannot be before its Parent Task's start date"),
        );
      }


      if (
        dto.deadlineDate &&
        parentTask.deadlineDate &&
        dto.deadlineDate >
          parentTask.deadlineDate
      ) {
        throw new BadRequestException(
          appError('SUB_TASK_DEADLINE_CANNOT_EXCEED_PARENT_TASK_S_DEADLINE', "Sub-task deadline cannot exceed its Parent Task's deadline"),
        );
      }
    }


    let createAssignee:
      UserEntity |
      undefined;

    if (
      dto.assignedToId
    ) {
      createAssignee =
        await this.assertValidAssignee(
          dto.assignedToId,
        );
    }


    const needsApproval =
      Boolean(
        dto.needsApproval,
      );


    if (
      needsApproval &&
      !dto.approverId
    ) {
      throw new BadRequestException(
        appError('APPROVER_REQUIRED_WHEN_TASK_NEEDS_APPROVAL', 'An approver is required when the Task needs approval'),
      );
    }


    let createApprover:
      UserEntity |
      undefined;

    if (
      needsApproval &&
      dto.approverId
    ) {
      createApprover =
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


    const needsBudget =
      Boolean(
        dto.needsBudget,
      );


    this.assertBudgetComplete(
      needsBudget,
      dto.budgetMin,
      dto.budgetMax,
    );


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


    const task =
      await this.taskRepo.save(
        this.taskRepo.create({
          title:
            dto.title,

          description:
            dto.description,

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


    await this.auditLogsService.record({
      actorId:
        actor.id,

      entityType:
        'Task',

      entityId:
        task.id,

      action:
        AuditAction.CREATE,

      newValue: {
        ...task,

        createdByName:
          actor.fullName,

        assigneeName:
          createAssignee?.fullName,

        approverName:
          createApprover?.fullName,
      },
    });


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
    id:
      string,

    dto:
      UpdateTaskDto,

    actor:
      UserEntity,
  ):
    Promise<TaskEntity> {
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
        appError('ONLY_TASK_CREATOR_ADMIN_MAY_EDIT_TASK', 'Only the Task creator or Admin may edit this Task'),
      );
    }


    if (
      task.archivedAt ||
      task.status ===
        TaskStatus.ARCHIVED
    ) {
      throw new BadRequestException(
        appError('CANNOT_EDIT_ARCHIVED_TASK', 'Cannot edit an archived Task'),
      );
    }


    if (
      task.status ===
        TaskStatus.PENDING_APPROVAL &&
      !isAdmin
    ) {
      throw new ForbiddenException(
        appError('TASK_PENDING_APPROVAL_CANNOT_EDITED_UNTIL_DECISION_MADE', 'Task is pending approval and cannot be edited until a decision is made'),
      );
    }


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
          appError('MOVING_DEADLINE_EARLIER_THAN_TODAY_REQUIRES_ADMIN_OVERRIDE', 'Moving the deadline earlier than today requires Admin override'),
        );
      }
    }


    if (
      dto.departmentId !==
      undefined
    ) {
      if (
        !dto.departmentId
      ) {
        throw new BadRequestException(
          appError('DEPARTMENT_REQUIRED', 'Department is required'),
        );
      }


      await this.assertActiveSettingById(
        SettingType.DEPARTMENT,
        dto.departmentId,
        'Department',
      );
    }


    if (
      dto.branchId
    ) {
      await this.assertActiveSettingById(
        SettingType.BRANCH,
        dto.branchId,
        'Branch',
      );
    }


    if (
      dto.projectId
    ) {
      await this.assertUsableProject(
        dto.projectId,
      );
    }


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
          appError('PARENT_TASK_NOT_FOUND', 'Parent Task not found'),
        );
      }


      if (
        parent.archivedAt ||
        parent.status ===
          TaskStatus.ARCHIVED
      ) {
        throw new BadRequestException(
          appError('CANNOT_ATTACH_TASK_ARCHIVED_PARENT_TASK', 'Cannot attach a Task to an archived Parent Task'),
        );
      }


      if (
        parent.deadlineDate &&
        effectiveDeadline &&
        effectiveDeadline >
          parent.deadlineDate
      ) {
        throw new BadRequestException(
          appError('SUB_TASK_DEADLINE_CANNOT_EXCEED_PARENT_TASK_S_DEADLINE', "Sub-task deadline cannot exceed its Parent Task's deadline"),
        );
      }
    }


    let updateAssignee:
      UserEntity |
      undefined;

    if (
      effectiveAssigneeId
    ) {
      updateAssignee =
        await this.assertValidAssignee(
          effectiveAssigneeId,
        );
    }


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
        appError('CANNOT_ENABLE_APPROVAL_ON_COMPLETED_FINISHED_TASK', 'Cannot enable approval on a completed or finished Task'),
      );
    }


    if (
      effectiveNeedsApproval &&
      !effectiveApproverId
    ) {
      throw new BadRequestException(
        appError('APPROVER_REQUIRED_WHEN_TASK_NEEDS_APPROVAL', 'An approver is required when the Task needs approval'),
      );
    }


    let updateApprover:
      UserEntity |
      undefined;

    if (
      effectiveNeedsApproval &&
      effectiveApproverId
    ) {
      updateApprover =
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


    this.assertBudgetComplete(
      effectiveNeedsBudget,
      effectiveBudgetMin,
      effectiveBudgetMax,
    );


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


    const oldValue = {
      ...task,
    };


    const oldProjectId =
      task.projectId;


    const oldApproverId =
      task.approverId;


    Object.assign(
      task,
      dto,
    );


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


    const saved =
      await this.taskRepo.save(
        task,
      );


    /*
     * Resolve human-readable names for any changed User references so the
     * Audit Log reads "assignee: X -> Y" instead of two opaque UUIDs (the
     * Audit Log UI hides raw *Id fields on purpose).
     */
    const oldAssigneeChanged =
      oldValue.assignedToId !==
      saved.assignedToId;

    const oldApproverChanged =
      oldApproverId !==
      saved.approverId;

    const [
      oldAssigneeForAudit,
      oldApproverForAudit,
    ] = await Promise.all([
      oldAssigneeChanged &&
      oldValue.assignedToId
        ? this.userRepo.findOne({
            where: {
              id: oldValue.assignedToId,
            },
          })
        : Promise.resolve(undefined),

      oldApproverChanged &&
      oldApproverId
        ? this.userRepo.findOne({
            where: {
              id: oldApproverId,
            },
          })
        : Promise.resolve(undefined),
    ]);

    await this.auditLogsService.record({
      actorId:
        actor.id,

      entityType:
        'Task',

      entityId:
        saved.id,

      action:
        AuditAction.UPDATE,

      oldValue: {
        ...oldValue,

        assigneeName:
          oldAssigneeForAudit?.fullName,

        approverName:
          oldApproverForAudit?.fullName,
      },

      newValue: {
        ...saved,

        assigneeName:
          oldAssigneeChanged
            ? updateAssignee?.fullName
            : undefined,

        approverName:
          oldApproverChanged
            ? updateApprover?.fullName
            : undefined,
      },
    });


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
    id:
      string,

    dto:
      UpdateAttachmentPermissionsDto,

    actor:
      UserEntity,
  ):
    Promise<TaskEntity> {
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
        appError('ONLY_TASK_CREATOR_ADMIN_MAY_CHANGE_ATTACHMENT_DOWNLOAD_PERMISSIONS', 'Only the Task creator or Admin may change attachment download permissions'),
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
        taskTitle:
          saved.title,

        assigneeCanDownloadAttachments:
          saved.assigneeCanDownloadAttachments,
      },
    });


    return saved;
  }


  /*
   * ==========================================================
   * CIRCULAR PARENT CHECK
   * ==========================================================
   */

  private async assertNoCircularReference(
    taskId:
      string,

    newParentId:
      string,
  ):
    Promise<void> {
    if (
      taskId ===
      newParentId
    ) {
      throw new BadRequestException(
        appError('TASK_CANNOT_REFERENCE_ITSELF_AS_OWN_PARENT', 'A Task cannot reference itself as its own parent'),
      );
    }


    let currentId:
      string | undefined =
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
          appError('CHANGE_WOULD_CREATE_CIRCULAR_TASK_HIERARCHY', 'This change would create a circular Task hierarchy'),
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
        TaskEntity | null =
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
    id:
      string,

    dto:
      UpdateTaskStatusDto,

    actor:
      UserEntity,
  ):
    Promise<TaskEntity> {
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
        appError('CANNOT_CHANGE_STATUS_ARCHIVED_TASK', 'Cannot change the status of an archived Task'),
      );
    }


    await this.assertValidListValue(
      SettingType.TASK_STATUS,
      dto.status,
      'Status',
    );


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
          appError('FINISHED_TASK_CAN_ONLY_REOPENED_BY_ADMIN', 'A Finished Task can only be reopened by Admin'),
        );
      }
    }


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
          task.status as
            TaskStatus
        ] ??
        [];


      if (
        !allowedNext.includes(
          dto.status as
            TaskStatus,
        )
      ) {
        if (
          task.status ===
            TaskStatus.COMPLETED &&
          dto.status ===
            TaskStatus.PENDING
        ) {
          throw new ConflictException(
            appError('COMPLETED_TASK_CANNOT_TRANSITION_BACK_PENDING', 'A Completed Task cannot transition back to Pending'),
          );
        }


        throw new ConflictException(
          appError('CANNOT_TRANSITION_TASK_FROM_VALUE_VALUE', `Cannot transition Task from ${task.status} to ${dto.status}`),
        );
      }
    }


    const configuredAllowedTargets =
      fromIsBuiltIn
        ? (
            ALLOWED_TRANSITIONS[
              task.status as
                TaskStatus
            ] ??
            []
          )
        : [];


    await this.taskWorkflowService.assertActionAllowed(
      task,
      dto.status,
      configuredAllowedTargets,
    );


    if (
      [
        TaskStatus.PENDING_APPROVAL,
        TaskStatus.COMPLETED,
        TaskStatus.FINISHED,
      ].includes(
        dto.status as
          TaskStatus,
      )
    ) {
      await this.assertNoOpenSubTasks(
        task.id,
      );
    }


    if (
      dto.status ===
      TaskStatus.PENDING_APPROVAL
    ) {
      if (
        !task.needsApproval
      ) {
        throw new ConflictException(
          appError('TASK_DOES_NOT_REQUIRE_APPROVAL', 'This Task does not require approval'),
        );
      }


      if (
        !task.approverId
      ) {
        throw new BadRequestException(
          appError('TASK_REQUIRES_APPROVAL_BUT_HAS_NO_APPROVER', 'This Task requires approval but has no approver'),
        );
      }


      await this.assertValidApprover(
        task.approverId,
      );


      task.approvalStatus =
        ApprovalStatus.PENDING;


      (
        task as any
      ).rejectionReason =
        null;
    }


    if (
      dto.status ===
        TaskStatus.COMPLETED &&
      task.needsApproval &&
      task.approvalStatus !==
        ApprovalStatus.APPROVED
    ) {
      throw new ConflictException(
        appError('TASK_REQUIRES_APPROVAL_ROUTE_IT_THROUGH_PENDINGAPPROVAL_HAVE_APPROVER_DECIDE_FIRST', 'This Task requires approval; route it through PendingApproval and have the approver decide first'),
      );
    }


    if (
      dto.status ===
        TaskStatus.FINISHED &&
      !dto.reason
    ) {
      throw new BadRequestException(
        appError('REASON_REQUIRED_FINISH_TASK', 'A reason is required to finish a Task'),
      );
    }


    const oldValue = {
      taskTitle:
        task.title,

      status:
        task.status,

      approvalStatus:
        task.approvalStatus,
    };


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
        taskTitle:
          saved.title,

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
   * APPROVAL DECISION
   * ==========================================================
   */

  async decideApproval(
    id:
      string,

    dto:
      DecideTaskApprovalDto,

    actor:
      UserEntity,
  ):
    Promise<TaskEntity> {
    const task =
      await this.findOne(
        id,
      );


    if (
      !task.needsApproval
    ) {
      throw new BadRequestException(
        appError('TASK_DOES_NOT_REQUIRE_APPROVAL', 'This Task does not require approval'),
      );
    }


    if (
      actor.role.name !==
        RoleName.ADMIN &&
      task.approverId !==
        actor.id
    ) {
      throw new ForbiddenException(
        appError('ONLY_DESIGNATED_APPROVER_ADMIN_MAY_DECIDE_ON_TASK', 'Only the designated approver or Admin may decide on this Task'),
      );
    }


    if (
      task.status !==
      TaskStatus.PENDING_APPROVAL
    ) {
      throw new ConflictException(
        appError('TASK_NOT_AWAITING_APPROVAL', 'This Task is not currently awaiting approval'),
      );
    }


    if (
      task.approvalStatus !==
      ApprovalStatus.PENDING
    ) {
      throw new ConflictException(
        appError('APPROVAL_REQUEST_HAS_ALREADY_BEEN_DECIDED', 'This approval request has already been decided'),
      );
    }


    if (
      dto.approve
    ) {
      await this.assertNoOpenSubTasks(
        task.id,
      );
    }


    const oldValue = {
      taskTitle:
        task.title,

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
        taskTitle:
          saved.title,

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
    task:
      TaskEntity,

    actor:
      UserEntity,
  ):
    Promise<void> {
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
        appError('ONLY_ASSIGNED_USER_S_TASK_CREATOR_ADMIN_MAY_CHANGE_STATUS', 'Only the assigned User(s), the Task creator, or Admin may change status'),
      );
    }
  }


  /*
   * ==========================================================
   * REOPEN
   * ==========================================================
   */

  private async reopen(
    task:
      TaskEntity,

    reason:
      string,

    actor:
      UserEntity,
  ):
    Promise<TaskEntity> {
    if (
      actor.role.name !==
      RoleName.ADMIN
    ) {
      throw new ForbiddenException(
        appError('ONLY_ADMIN_MAY_REOPEN_TASK', 'Only Admin may reopen a Task'),
      );
    }


    if (
      task.status !==
        TaskStatus.COMPLETED &&
      task.status !==
        TaskStatus.FINISHED
    ) {
      throw new ConflictException(
        appError('ONLY_COMPLETED_FINISHED_TASK_CAN_REOPENED', 'Only a Completed or Finished Task can be reopened'),
      );
    }


    const oldValue = {
      taskTitle:
        task.title,

      status:
        task.status,
    };


    task.status =
      TaskStatus.REOPENED;


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
        taskTitle:
          saved.title,

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
    id:
      string,

    actor:
      UserEntity,

    hardDelete =
      false,
  ):
    Promise<void> {
    const task =
      await this.findOne(
        id,
      );


    const projectId =
      task.projectId;


    if (
      hardDelete
    ) {
      if (
        actor.role.name !==
        RoleName.ADMIN
      ) {
        throw new ForbiddenException(
          appError('ONLY_ADMIN_MAY_PERMANENTLY_DELETE_TASK', 'Only Admin may permanently delete a Task'),
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
          appError('CANNOT_PERMANENTLY_DELETE_TASK_THAT_HAS_ASSIGNMENTS_COMMENTS_ATTACHMENTS_RATINGS', 'Cannot permanently delete a Task that has Assignments, Comments, Attachments, or Ratings'),
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

        oldValue: {
          taskTitle:
            task.title,

          status:
            task.status,
        },
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


    if (
      actor.role.name !==
        RoleName.ADMIN &&
      task.createdById !==
        actor.id
    ) {
      throw new ForbiddenException(
        appError('ONLY_TASK_CREATOR_ADMIN_MAY_ARCHIVE_TASK', 'Only the Task creator or Admin may archive this Task'),
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

      oldValue: {
        taskTitle:
          task.title,

        status:
          task.statusBeforeArchive,
      },

      newValue: {
        taskTitle:
          task.title,

        status:
          task.status,
      },
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
    id:
      string,

    actor:
      UserEntity,
  ):
    Promise<TaskEntity> {
    if (
      actor.role.name !==
      RoleName.ADMIN
    ) {
      throw new ForbiddenException(
        appError('ONLY_ADMIN_MAY_UNARCHIVE_TASK', 'Only Admin may unarchive a Task'),
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
        appError('ONLY_ARCHIVED_TASK_CAN_UNARCHIVED', 'Only an Archived Task can be unarchived'),
      );
    }


    const oldValue = {
      taskTitle:
        task.title,

      status:
        task.status,

      archivedAt:
        task.archivedAt,
    };


    task.status =
      task.statusBeforeArchive ??
      TaskStatus.PENDING;


    task.archivedAt =
      null;


    task.statusBeforeArchive =
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
        AuditAction.RESTORE,

      oldValue,

      newValue: {
        taskTitle:
          saved.title,

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
