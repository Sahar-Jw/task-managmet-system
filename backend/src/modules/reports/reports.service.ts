import {
  Injectable,
} from '@nestjs/common';

import {
  InjectRepository,
} from '@nestjs/typeorm';

import {
  Repository,
  SelectQueryBuilder,
} from 'typeorm';

import {
  TaskEntity,
} from '../tasks/entities/task.entity';

import {
  UserEntity,
} from '../users/entities/user.entity';

import {
  TaskRatingEntity,
} from '../task-ratings/entities/task-rating.entity';

import {
  TaskStatus,
} from '../../shared/enums/task-status.enum';


export interface ReportFilters {
  branchId?: string;
  departmentId?: string;
  dateFrom?: string;
  dateTo?: string;
}


@Injectable()
export class ReportsService {
  constructor(
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
      TaskRatingEntity,
    )
    private readonly ratingRepo:
      Repository<TaskRatingEntity>,
  ) {}


  /*
   * ==========================================================
   * TASK SUMMARY
   * ==========================================================
   */

  async taskSummary(
    filters:
      ReportFilters,
  ) {
    const base =
      this.taskRepo
        .createQueryBuilder(
          'task',
        );


    this.applyTaskFilters(
      base,
      filters,
    );


    const byStatus =
      await base
        .clone()
        .select(
          'task.status',
          'status',
        )
        .addSelect(
          'COUNT(*)',
          'count',
        )
        .groupBy(
          'task.status',
        )
        .getRawMany();


    const byPriority =
      await base
        .clone()
        .select(
          'task.priority',
          'priority',
        )
        .addSelect(
          'COUNT(*)',
          'count',
        )
        .groupBy(
          'task.priority',
        )
        .getRawMany();


    const byDepartment =
      await base
        .clone()
        .leftJoin(
          'task.department',
          'department',
        )
        .select(
          'department.valueEn',
          'department',
        )
        .addSelect(
          'COUNT(*)',
          'count',
        )
        .groupBy(
          'department.id',
        )
        .addGroupBy(
          'department.valueEn',
        )
        .getRawMany();


    return {
      byStatus,
      byPriority,
      byDepartment,
    };
  }


  /*
   * ==========================================================
   * MONTHLY SUMMARY
   * ==========================================================
   *
   * MySQL / MariaDB version.
   *
   * PostgreSQL previously used:
   *
   * to_char(...)
   * COUNT(*) FILTER (WHERE ...)
   *
   * MariaDB uses:
   *
   * DATE_FORMAT(...)
   * SUM(CASE WHEN ... THEN 1 ELSE 0 END)
   * ==========================================================
   */

  async monthlySummary(
    filters:
      ReportFilters,

    months =
      12,
  ) {
    const safeMonths =
      Math.max(
        1,
        Math.min(
          60,
          months,
        ),
      );


    const base =
      this.taskRepo
        .createQueryBuilder(
          'task',
        );


    this.applyTaskFilters(
      base,
      filters,
    );


    const raw =
      await base
        .clone()
        .select(
          `DATE_FORMAT(
            task.createdAt,
            '%Y-%m'
          )`,
          'month',
        )
        .addSelect(
          `
            SUM(
              CASE
                WHEN task.status IN (:...doneStatuses)
                THEN 1
                ELSE 0
              END
            )
          `,
          'done',
        )
        .addSelect(
          `
            SUM(
              CASE
                WHEN task.status NOT IN (:...doneStatuses)
                THEN 1
                ELSE 0
              END
            )
          `,
          'notDone',
        )
        .setParameter(
          'doneStatuses',
          [
            TaskStatus.COMPLETED,
            TaskStatus.FINISHED,
          ],
        )
        .groupBy(
          `DATE_FORMAT(
            task.createdAt,
            '%Y-%m'
          )`,
        )
        .orderBy(
          `DATE_FORMAT(
            task.createdAt,
            '%Y-%m'
          )`,
          'ASC',
        )
        .getRawMany<{
          month: string;
          done: string;
          notDone: string;
        }>();


    const byMonth =
      new Map(
        raw.map(
          (
            row,
          ) => [
            row.month,
            row,
          ],
        ),
      );


    const result:
      Array<{
        month: string;
        done: number;
        notDone: number;
      }> =
      [];


    const now =
      new Date();


    for (
      let i =
        safeMonths -
        1;

      i >=
      0;

      i--
    ) {
      const date =
        new Date(
          now.getFullYear(),
          now.getMonth() -
            i,
          1,
        );


      const key =
        `${date.getFullYear()}-${String(
          date.getMonth() +
            1,
        ).padStart(
          2,
          '0',
        )}`;


      const found =
        byMonth.get(
          key,
        );


      result.push({
        month:
          key,

        done:
          found
            ? Number(
                found.done,
              ) || 0
            : 0,

        notDone:
          found
            ? Number(
                found.notDone,
              ) || 0
            : 0,
      });
    }


    return result;
  }


  /*
   * ==========================================================
   * DEPARTMENT OVERVIEW
   * ==========================================================
   */

  async departmentOverview(
    scopeDepartmentId?:
      string,
  ) {
    const qb =
      this.taskRepo
        .createQueryBuilder(
          'task',
        )
        .leftJoin(
          'task.department',
          'department',
        )
        .where(
          'task.departmentId IS NOT NULL',
        );


    if (
      scopeDepartmentId
    ) {
      qb.andWhere(
        'task.departmentId = :scopeDepartmentId',
        {
          scopeDepartmentId,
        },
      );
    }


    const raw =
      await qb
        .select(
          'department.id',
          'departmentId',
        )
        .addSelect(
          'department.valueEn',
          'departmentNameEn',
        )
        .addSelect(
          'department.valueAr',
          'departmentNameAr',
        )
        .addSelect(
          'COUNT(*)',
          'totalTasks',
        )
        .addSelect(
          `
            SUM(
              CASE
                WHEN task.status = :completedStatus
                THEN 1
                ELSE 0
              END
            )
          `,
          'completedTasks',
        )
        .addSelect(
          `
            SUM(
              CASE
                WHEN
                  task.deadlineDate < CURRENT_DATE()
                  AND task.status NOT IN (:...doneStatuses)
                THEN 1
                ELSE 0
              END
            )
          `,
          'overdueTasks',
        )
        .setParameters({
          completedStatus:
            TaskStatus.COMPLETED,

          doneStatuses: [
            TaskStatus.COMPLETED,
            TaskStatus.FINISHED,
            TaskStatus.ARCHIVED,
          ],
        })
        .groupBy(
          'department.id',
        )
        .addGroupBy(
          'department.valueEn',
        )
        .addGroupBy(
          'department.valueAr',
        )
        .orderBy(
          'department.valueEn',
          'ASC',
        )
        .getRawMany();


    return raw.map(
      (
        row,
      ) => ({
        departmentId:
          row.departmentId,

        departmentNameEn:
          row.departmentNameEn,

        departmentNameAr:
          row.departmentNameAr,

        totalTasks:
          Number(
            row.totalTasks,
          ) || 0,

        completedTasks:
          Number(
            row.completedTasks,
          ) || 0,

        overdueTasks:
          Number(
            row.overdueTasks,
          ) || 0,
      }),
    );
  }


  /*
   * ==========================================================
   * USER PERFORMANCE
   * ==========================================================
   */

  async userPerformance(
    filters:
      ReportFilters,
  ) {
    const usersQb =
      this.userRepo
        .createQueryBuilder(
          'user',
        )
        .leftJoinAndSelect(
          'user.role',
          'role',
        );


    if (
      filters.branchId
    ) {
      usersQb.andWhere(
        'user.branchId = :branchId',
        {
          branchId:
            filters.branchId,
        },
      );
    }


    if (
      filters.departmentId
    ) {
      usersQb.andWhere(
        'user.departmentId = :departmentId',
        {
          departmentId:
            filters.departmentId,
        },
      );
    }


    /*
     * Don't include archived/deactivated accounts in performance.
     */
    usersQb.andWhere(
      'user.isActive = :active',
      {
        active:
          true,
      },
    );


    const users =
      await usersQb.getMany();


    const today =
      new Date()
        .toISOString()
        .slice(
          0,
          10,
        );


    const results =
      await Promise.all(
        users.map(
          async (
            user,
          ) => {
            const assignedTotal =
              await this.taskRepo
                .createQueryBuilder(
                  'task',
                )
                .where(
                  'task.assignedToId = :userId',
                  {
                    userId:
                      user.id,
                  },
                )
                .andWhere(
                  'task.archivedAt IS NULL',
                )
                .getCount();


            const completed =
              await this.taskRepo
                .createQueryBuilder(
                  'task',
                )
                .where(
                  'task.assignedToId = :userId',
                  {
                    userId:
                      user.id,
                  },
                )
                .andWhere(
                  'task.status IN (:...completedStatuses)',
                  {
                    completedStatuses: [
                      TaskStatus.COMPLETED,
                      TaskStatus.FINISHED,
                    ],
                  },
                )
                .getCount();


            const overdue =
              await this.taskRepo
                .createQueryBuilder(
                  'task',
                )
                .where(
                  'task.assignedToId = :userId',
                  {
                    userId:
                      user.id,
                  },
                )
                .andWhere(
                  'task.deadlineDate < :today',
                  {
                    today,
                  },
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
                )
                .getCount();


            const ratingAvg =
              await this.ratingRepo
                .createQueryBuilder(
                  'rating',
                )
                .innerJoin(
                  'rating.task',
                  'task',
                )
                .where(
                  'task.assignedToId = :userId',
                  {
                    userId:
                      user.id,
                  },
                )
                .select(
                  'AVG(rating.score)',
                  'avg',
                )
                .getRawOne<{
                  avg:
                    string | null;
                }>();


            const averageRating =
              ratingAvg?.avg
                ? Number(
                    Number(
                      ratingAvg.avg,
                    ).toFixed(
                      2,
                    ),
                  )
                : null;


            return {
              userId:
                user.id,

              fullName:
                user.fullName,

              assignedTotal,

              completed,

              completionRate:
                assignedTotal >
                0
                  ? Math.round(
                      (
                        completed /
                        assignedTotal
                      ) *
                        100,
                    )
                  : 0,

              overdue,

              averageRating,
            };
          },
        ),
      );


    return results;
  }


  /*
   * ==========================================================
   * BRANCH OVERVIEW
   * ==========================================================
   */

  async branchOverview(
    scopeBranchId?:
      string,
  ) {
    const qb =
      this.taskRepo
        .createQueryBuilder(
          'task',
        )
        .leftJoin(
          'task.branch',
          'branch',
        )
        .where(
          'task.branchId IS NOT NULL',
        );


    if (
      scopeBranchId
    ) {
      qb.andWhere(
        'task.branchId = :scopeBranchId',
        {
          scopeBranchId,
        },
      );
    }


    const raw =
      await qb
        .select(
          'branch.id',
          'branchId',
        )
        .addSelect(
          'branch.valueEn',
          'branchNameEn',
        )
        .addSelect(
          'branch.valueAr',
          'branchNameAr',
        )
        .addSelect(
          'COUNT(*)',
          'totalTasks',
        )
        .addSelect(
          `
            SUM(
              CASE
                WHEN task.status = :completedStatus
                THEN 1
                ELSE 0
              END
            )
          `,
          'completedTasks',
        )
        .addSelect(
          `
            SUM(
              CASE
                WHEN
                  task.deadlineDate < CURRENT_DATE()
                  AND task.status NOT IN (:...doneStatuses)
                THEN 1
                ELSE 0
              END
            )
          `,
          'overdueTasks',
        )
        .setParameters({
          completedStatus:
            TaskStatus.COMPLETED,

          doneStatuses: [
            TaskStatus.COMPLETED,
            TaskStatus.FINISHED,
            TaskStatus.ARCHIVED,
          ],
        })
        .groupBy(
          'branch.id',
        )
        .addGroupBy(
          'branch.valueEn',
        )
        .addGroupBy(
          'branch.valueAr',
        )
        .orderBy(
          'branch.valueEn',
          'ASC',
        )
        .getRawMany();


    return raw.map(
      (
        row,
      ) => ({
        branchId:
          row.branchId,

        branchNameEn:
          row.branchNameEn,

        branchNameAr:
          row.branchNameAr,

        totalTasks:
          Number(
            row.totalTasks,
          ) || 0,

        completedTasks:
          Number(
            row.completedTasks,
          ) || 0,

        overdueTasks:
          Number(
            row.overdueTasks,
          ) || 0,
      }),
    );
  }


  /*
   * ==========================================================
   * COMMON FILTERS
   * ==========================================================
   */

  private applyTaskFilters(
    qb:
      SelectQueryBuilder<TaskEntity>,

    filters:
      ReportFilters,
  ) {
    if (
      filters.departmentId
    ) {
      qb.andWhere(
        'task.departmentId = :departmentId',
        {
          departmentId:
            filters.departmentId,
        },
      );
    }


    if (
      filters.branchId
    ) {
      qb.andWhere(
        'task.branchId = :branchId',
        {
          branchId:
            filters.branchId,
        },
      );
    }


    if (
      filters.dateFrom
    ) {
      qb.andWhere(
        'task.createdAt >= :dateFrom',
        {
          dateFrom:
            filters.dateFrom,
        },
      );
    }


    if (
      filters.dateTo
    ) {
      /*
       * Include the full final calendar day.
       *
       * MySQL/MariaDB syntax.
       */
      qb.andWhere(
        `
          task.createdAt <
          DATE_ADD(
            CAST(:dateTo AS DATE),
            INTERVAL 1 DAY
          )
        `,
        {
          dateTo:
            filters.dateTo,
        },
      );
    }
  }
}
