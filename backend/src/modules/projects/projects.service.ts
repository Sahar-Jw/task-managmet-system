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
  ProjectEntity,
} from './entities/project.entity';

import {
  TaskEntity,
} from '../tasks/entities/task.entity';

import {
  UserEntity,
} from '../users/entities/user.entity';

import {
  SettingEntity,
} from '../settings/entities/setting.entity';

import {
  CreateProjectDto,
  QueryProjectsDto,
  UpdateProjectDto,
} from './dto/project.dto';

import {
  AuditLogsService,
} from '../audit-logs/audit-logs.service';

import {
  ProjectStatus,
} from '../../shared/enums/project-status.enum';

import {
  AuditAction,
} from '../../shared/enums/audit-action.enum';

import {
  TaskStatus,
} from '../../shared/enums/task-status.enum';

import {
  RoleName,
} from '../../shared/enums/role.enum';


/*
 * ============================================================
 * PROJECT RESPONSE
 * ============================================================
 */

export type ProjectWithOwner =
  ProjectEntity & {
    ownerName?: string;

    ownerDepartmentName?: string;
    ownerBranchName?: string;
  };


/*
 * ============================================================
 * SERVICE
 * ============================================================
 */

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(
      ProjectEntity,
    )
    private readonly projectRepo:
      Repository<ProjectEntity>,


    @InjectRepository(
      TaskEntity,
    )
    private readonly taskRepo:
      Repository<TaskEntity>,


    @InjectRepository(
      UserEntity,
    )
    private readonly userRepo:
      Repository<UserEntity>,


    @InjectRepository(
      SettingEntity,
    )
    private readonly settingRepo:
      Repository<SettingEntity>,


    private readonly auditLogsService:
      AuditLogsService,
  ) {}


  /*
   * ==========================================================
   * HELPERS
   * ==========================================================
   */

  private normalizeName(
    name: string,
  ) {
    return name.trim();
  }


  private assertValidDateRange(
    startDate?: string | null,
    endDate?: string | null,
  ) {
    if (
      startDate &&
      endDate &&
      endDate < startDate
    ) {
      throw new BadRequestException(
        appError('PROJECT_END_DATE_CANNOT_BEFORE_START_DATE', 'Project end date cannot be before the start date'),
      );
    }
  }


  private assertValidFilterRange(
    from:
      | string
      | undefined,
    to:
      | string
      | undefined,
    label: string,
  ) {
    if (
      from &&
      to &&
      to < from
    ) {
      throw new BadRequestException(
        appError('VALUE_DATE_CANNOT_BEFORE_FROM_DATE', `${label} "to" date cannot be before the "from" date`),
      );
    }
  }


  /*
   * Project names should be unique regardless of letter casing.
   *
   * Example:
   *
   * Marketing Website
   * marketing website
   *
   * should be treated as the same project name.
   */
  private async findByNameInsensitive(
    name: string,
  ) {
    return this.projectRepo
      .createQueryBuilder(
        'project',
      )
      .where(
        'LOWER(TRIM(project.name)) = LOWER(TRIM(:name))',
        {
          name,
        },
      )
      .getOne();
  }


  /*
   * ==========================================================
   * LIST
   * ==========================================================
   */

  async findAll(
    query: QueryProjectsDto,
    actor: UserEntity,
  ) {
    const page =
      query.page ??
      1;

    const limit =
      query.limit ??
      20;


    const isAdmin =
      actor.role?.name ===
      RoleName.ADMIN;


    /*
     * Regular users always see Projects they created.
     *
     * Admin:
     *
     * mine=true -> only Admin's own Projects
     * otherwise -> entire organization
     */
    const scopeToSelf =
      !isAdmin ||
      query.mine ===
        'true';


    /*
     * Validate filter ranges before building SQL.
     */
    this.assertValidFilterRange(
      query.createdDateFrom,
      query.createdDateTo,
      'Created date',
    );


    this.assertValidFilterRange(
      query.startDateFrom,
      query.startDateTo,
      'Start date',
    );


    this.assertValidFilterRange(
      query.endDateFrom,
      query.endDateTo,
      'End date',
    );


    const qb =
      this.projectRepo
        .createQueryBuilder(
          'project',
        )
        .leftJoin(
          UserEntity,
          'owner',
          'owner.id = project.createdById',
        );


    /*
     * ========================================================
     * SCOPE
     * ========================================================
     */

    if (
      scopeToSelf
    ) {
      qb.andWhere(
        'project.createdById = :actorId',
        {
          actorId:
            actor.id,
        },
      );
    }


    /*
     * ========================================================
     * ARCHIVE / STATUS
     * ========================================================
     */

    if (
      query.status
    ) {
      qb.andWhere(
        'project.status = :status',
        {
          status:
            query.status,
        },
      );
    } else if (
      query.excludeArchived ===
      'true'
    ) {
      qb.andWhere(
        'project.status != :archived',
        {
          archived:
            ProjectStatus.ARCHIVED,
        },
      );
    }


    /*
     * ========================================================
     * SEARCH
     * ========================================================
     *
     * One search field now searches:
     *
     * - project name
     * - description
     * - owner's name
     */

    if (
      query.search?.trim()
    ) {
      qb.andWhere(
        `(
          project.name LIKE :search
          OR project.description LIKE :search
          OR owner.fullName LIKE :search
        )`,
        {
          search:
            `%${query.search.trim()}%`,
        },
      );
    }


    /*
     * Older individual filters remain supported.
     */

    if (
      query.name
    ) {
      qb.andWhere(
        'project.name LIKE :name',
        {
          name:
            `%${query.name}%`,
        },
      );
    }


    if (
      query.description
    ) {
      qb.andWhere(
        'project.description LIKE :description',
        {
          description:
            `%${query.description}%`,
        },
      );
    }


    /*
     * ========================================================
     * OWNER / ORG
     * ========================================================
     */

    if (
      query.ownerId
    ) {
      qb.andWhere(
        'project.createdById = :ownerId',
        {
          ownerId:
            query.ownerId,
        },
      );
    }


    if (
      query.departmentId
    ) {
      qb.andWhere(
        'owner.departmentId = :departmentId',
        {
          departmentId:
            query.departmentId,
        },
      );
    }


    if (
      query.branchId
    ) {
      qb.andWhere(
        'owner.branchId = :branchId',
        {
          branchId:
            query.branchId,
        },
      );
    }


    /*
     * ========================================================
     * CREATED DATE
     * ========================================================
     */

    if (
      query.createdDateFrom
    ) {
      qb.andWhere(
        'project.createdAt >= :createdDateFrom',
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
      project.createdAt <
      DATE_ADD(
        CAST(
          :createdDateTo
          AS DATE
        ),
        INTERVAL 1 DAY
      )
    `,
    {
      createdDateTo:
        query.createdDateTo,
    },
  );
}


    /*
     * ========================================================
     * PROJECT START DATE
     * ========================================================
     */

    if (
      query.startDateFrom
    ) {
      qb.andWhere(
        'project.startDate >= :startDateFrom',
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
        'project.startDate <= :startDateTo',
        {
          startDateTo:
            query.startDateTo,
        },
      );
    }


    /*
     * ========================================================
     * PROJECT END DATE
     * ========================================================
     */

    if (
      query.endDateFrom
    ) {
      qb.andWhere(
        'project.endDate >= :endDateFrom',
        {
          endDateFrom:
            query.endDateFrom,
        },
      );
    }


    if (
      query.endDateTo
    ) {
      qb.andWhere(
        'project.endDate <= :endDateTo',
        {
          endDateTo:
            query.endDateTo,
        },
      );
    }


    /*
     * ========================================================
     * SORT
     * ========================================================
     */

    const sortColumns: Record<
      string,
      string
    > = {
      name:
        'project.name',

      status:
        'project.status',

      createdAt:
        'project.createdAt',

      startDate:
        'project.startDate',

      endDate:
        'project.endDate',
    };


    const sortBy =
      sortColumns[
        query.sortBy ??
          'name'
      ] ??
      'project.name';


    const sortDir =
      query.sortDir ===
      'desc'
        ? 'DESC'
        : 'ASC';


    qb.orderBy(
      sortBy,
      sortDir,
    );

    if (
      sortBy !==
      'project.name'
    ) {
      qb.addOrderBy(
        'project.name',
        'ASC',
      );
    }

    /*
     * ========================================================
     * PAGINATION
     * ========================================================
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


    const [
      items,
      total,
    ] =
      await qb.getManyAndCount();


    return {
      items:
        await this.attachOwners(
          items,
        ),

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
    actor?: UserEntity,
  ): Promise<ProjectWithOwner> {
    const project =
      await this.projectRepo.findOne({
        where: {
          id,
        },
      });


    if (
      !project
    ) {
      throw new NotFoundException(
        appError('PROJECT_NOT_FOUND', 'Project not found'),
      );
    }


    /*
     * Regular User cannot access somebody else's Project.
     */
    if (
      actor &&
      actor.role?.name !==
        RoleName.ADMIN &&
      project.createdById !==
        actor.id
    ) {
      throw new ForbiddenException(
        appError('YOU_DO_NOT_HAVE_ACCESS_PROJECT', 'You do not have access to this project'),
      );
    }


    const [
      withOwner,
    ] =
      await this.attachOwners([
        project,
      ]);


    return withOwner;
  }


  /*
   * ==========================================================
   * OWNER INFORMATION
   * ==========================================================
   */

  private async attachOwners(
    projects: ProjectEntity[],
  ): Promise<ProjectWithOwner[]> {
    const ownerIds =
      [
        ...new Set(
          projects
            .map(
              (
                project,
              ) =>
                project.createdById,
            )
            .filter(
              (
                value,
              ): value is string =>
                Boolean(
                  value,
                ),
            ),
        ),
      ];


    if (
      ownerIds.length ===
      0
    ) {
      return projects;
    }


    const owners =
      await this.userRepo.find({
        where: {
          id:
            In(
              ownerIds,
            ),
        },
      });


    const ownerById =
      new Map(
        owners.map(
          (
            owner,
          ) => [
            owner.id,
            owner,
          ],
        ),
      );


    /*
     * Collect Department and Branch Settings used by owners.
     */

    const organizationSettingIds =
      [
        ...new Set(
          owners
            .flatMap(
              (
                owner,
              ) => [
                owner.departmentId,
                owner.branchId,
              ],
            )
            .filter(
              (
                value,
              ): value is string =>
                Boolean(
                  value,
                ),
            ),
        ),
      ];


    const settings =
      organizationSettingIds.length >
      0
        ? await this.settingRepo.find({
            where: {
              id:
                In(
                  organizationSettingIds,
                ),
            },
          })
        : [];


    const settingNameById =
      new Map(
        settings.map(
          (
            setting,
          ) => [
            setting.id,

            setting.valueEn ||
              setting.codeEn ||
              setting.valueAr ||
              setting.codeAr,
          ],
        ),
      );


    return projects.map(
      (
        project,
      ) => {
        const owner =
          project.createdById
            ? ownerById.get(
                project.createdById,
              )
            : undefined;


        return {
          ...project,

          ownerName:
            owner?.fullName,

          ownerDepartmentName:
            owner?.departmentId
              ? settingNameById.get(
                  owner.departmentId,
                )
              : undefined,

          ownerBranchName:
            owner?.branchId
              ? settingNameById.get(
                  owner.branchId,
                )
              : undefined,
        };
      },
    );
  }


  /*
   * ==========================================================
   * CREATE
   * ==========================================================
   */

  async create(
    dto: CreateProjectDto,
    actor: UserEntity,
  ): Promise<ProjectEntity> {
    const name =
      this.normalizeName(
        dto.name,
      );


    if (!name) {
      throw new BadRequestException(
        appError('PROJECT_NAME_REQUIRED', 'Project name is required'),
      );
    }


    /*
     * Validate schedule.
     */
    this.assertValidDateRange(
      dto.startDate,
      dto.endDate,
    );


    /*
     * Case-insensitive uniqueness.
     */
    const existing =
      await this.findByNameInsensitive(
        name,
      );


    if (
      existing
    ) {
      throw new ConflictException(
        appError('PROJECT_NAME_MUST_UNIQUE', 'Project name must be unique'),
      );
    }


    const project =
      await this.projectRepo.save(
        this.projectRepo.create({
          name,

          description:
            dto.description?.trim() ||
            undefined,

          startDate:
            dto.startDate,

          endDate:
            dto.endDate,

          createdById:
            actor.id,

          status:
            ProjectStatus.PLANNED,
        }),
      );


    await this.auditLogsService.record({
      actorId:
        actor.id,

      entityType:
        'Project',

      entityId:
        project.id,

      action:
        AuditAction.CREATE,

      newValue:
        project,
    });


    return project;
  }


  /*
   * ==========================================================
   * UPDATE
   * ==========================================================
   */

  async update(
  id: string,
  dto: UpdateProjectDto,
  actor: UserEntity,
): Promise<ProjectEntity> {
  const project =
    await this.findOne(
      id,
      actor,
    );


  if (
    project.status ===
    ProjectStatus.ARCHIVED
  ) {
    throw new BadRequestException(
      appError('CANNOT_EDIT_ARCHIVED_PROJECT', 'Cannot edit an archived Project'),
    );
  }


  /*
   * Snapshot BEFORE changing anything.
   */
  const oldValue = {
    ...project,
  };


  const effectiveStartDate =
    dto.startDate !==
    undefined
      ? dto.startDate
      : project.startDate;


  const effectiveEndDate =
    dto.endDate !==
    undefined
      ? dto.endDate
      : project.endDate;


  this.assertValidDateRange(
    effectiveStartDate,
    effectiveEndDate,
  );


  /*
   * Name.
   */
  if (
    dto.name !==
    undefined
  ) {
    const normalizedName =
      this.normalizeName(
        dto.name,
      );


    if (
      !normalizedName
    ) {
      throw new BadRequestException(
        appError('PROJECT_NAME_REQUIRED', 'Project name is required'),
      );
    }


    if (
      normalizedName.toLowerCase() !==
      project.name
        .trim()
        .toLowerCase()
    ) {
      const existing =
        await this.findByNameInsensitive(
          normalizedName,
        );


      if (
        existing &&
        existing.id !==
          id
      ) {
        throw new ConflictException(
          appError('PROJECT_NAME_MUST_UNIQUE', 'Project name must be unique'),
        );
      }
    }


    project.name =
      normalizedName;
  }


  /*
   * Description.
   */
  if (
    dto.description !==
    undefined
  ) {
    project.description =
      dto.description.trim();
  }


  /*
   * Dates.
   */
  if (
    dto.startDate !==
    undefined
  ) {
    project.startDate =
      dto.startDate;
  }


  if (
    dto.endDate !==
    undefined
  ) {
    project.endDate =
      dto.endDate;
  }


  const saved =
    await this.projectRepo.save(
      project,
    );


  await this.auditLogsService.record({
    actorId:
      actor.id,

    entityType:
      'Project',

    entityId:
      saved.id,

    action:
      AuditAction.UPDATE,

    oldValue,

    newValue:
      saved,
  });


  return saved;
}


  /*
   * ==========================================================
   * DELETE
   * ==========================================================
   */

  async remove(
    id: string,
    actor: UserEntity,
  ): Promise<void> {
    const project =
      await this.findOne(
        id,
        actor,
      );


    /*
     * Projects with work attached should not disappear.
     *
     * Archive instead.
     */
    const taskCount =
      await this.taskRepo.count({
        where: {
          projectId:
            id,
        },
      });


    if (
      taskCount >
      0
    ) {
      throw new BadRequestException(
        appError('PROJECTS_BUSINESS_RULE_VIOLATION', `Cannot delete this Project: it still has ${taskCount} task(s) attached to it. ` +
          'Remove or reassign those Tasks first, or archive the Project instead.'),
      );
    }


    await this.projectRepo.remove(
      project,
    );


    await this.auditLogsService.record({
      actorId:
        actor.id,

      entityType:
        'Project',

      entityId:
        id,

      action:
        AuditAction.DELETE,

      oldValue:
        project,
    });
  }


  /*
   * ==========================================================
   * ARCHIVE
   * ==========================================================
   */

  async archive(
    id: string,
    actor: UserEntity,
  ): Promise<ProjectEntity> {
    /*
     * Controller currently makes this Admin-only, but passing actor
     * here also keeps the Service safe when called from elsewhere.
     */
    const project =
      await this.findOne(
        id,
        actor,
      );


    if (
      project.status ===
      ProjectStatus.ARCHIVED
    ) {
      throw new ConflictException(
        appError('PROJECT_ALREADY_ARCHIVED', 'Project is already archived'),
      );
    }


    const oldValue = {
      ...project,
    };


    project.status =
      ProjectStatus.ARCHIVED;

    project.archivedAt =
      new Date();


    const saved =
      await this.projectRepo.save(
        project,
      );


    await this.auditLogsService.record({
      actorId:
        actor.id,

      entityType:
        'Project',

      entityId:
        saved.id,

      action:
        AuditAction.ARCHIVE,

      oldValue,

      newValue:
        saved,
    });


    return saved;
  }


  /*
   * ==========================================================
   * UNARCHIVE
   * ==========================================================
   */

  async unarchive(
    id: string,
    actor: UserEntity,
  ): Promise<ProjectEntity> {
    const project =
      await this.findOne(
        id,
        actor,
      );


    if (
      project.status !==
      ProjectStatus.ARCHIVED
    ) {
      throw new BadRequestException(
        appError('ONLY_ARCHIVED_PROJECT_CAN_UNARCHIVED', 'Only an Archived Project can be unarchived'),
      );
    }


    const oldValue = {
      status:
        project.status,

      archivedAt:
        project.archivedAt,
    };


    project.status =
      ProjectStatus.PLANNED;

    project.archivedAt =
      undefined;


    const saved =
      await this.projectRepo.save(
        project,
      );


    await this.auditLogsService.record({
      actorId:
        actor.id,

      entityType:
        'Project',

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


    /*
     * Derive the correct status from any existing Tasks.
     */
    await this.recomputeStatus(
      saved.id,
    );


    return this.findOne(
      saved.id,
    );
  }


  /*
   * ==========================================================
   * RECOMPUTE STATUS
   * ==========================================================
   *
   * Status remains system-derived:
   *
   * no active/relevant Tasks
   *      -> Planned
   *
   * relevant Tasks exist and ALL completed
   *      -> Completed
   *
   * otherwise
   *      -> Active
   *
   * Finished and Archived Tasks do not keep a Project Active.
   * ==========================================================
   */

  async recomputeStatus(
    projectId: string,
  ): Promise<void> {
    const project =
      await this.projectRepo.findOne({
        where: {
          id:
            projectId,
        },
      });


    if (
      !project ||
      project.status ===
        ProjectStatus.ARCHIVED
    ) {
      return;
    }


    const tasks =
      await this.taskRepo.find({
        where: {
          projectId,
        },
      });


    const relevantTasks =
      tasks.filter(
        (
          task,
        ) =>
          task.status !==
            TaskStatus.FINISHED &&
          task.status !==
            TaskStatus.ARCHIVED,
      );


    let newStatus:
      ProjectStatus;


    if (
      relevantTasks.length ===
      0
    ) {
      newStatus =
        ProjectStatus.PLANNED;
    } else {
      const allCompleted =
        relevantTasks.every(
          (
            task,
          ) =>
            task.status ===
            TaskStatus.COMPLETED,
        );


      newStatus =
        allCompleted
          ? ProjectStatus.COMPLETED
          : ProjectStatus.ACTIVE;
    }


    if (
      project.status ===
      newStatus
    ) {
      return;
    }


    const oldValue = {
      status:
        project.status,
    };


    project.status =
      newStatus;


    await this.projectRepo.save(
      project,
    );


    await this.auditLogsService.record({
      actorId:
        null,

      entityType:
        'Project',

      entityId:
        project.id,

      action:
        AuditAction.STATUS_CHANGE,

      oldValue,

      newValue: {
        status:
          newStatus,
      },

      reason:
        'System-derived from Task completion state',
    });
  }
}