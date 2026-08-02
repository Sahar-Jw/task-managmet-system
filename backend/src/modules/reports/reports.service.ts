import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskEntity } from '../tasks/entities/task.entity';
import { UserEntity } from '../users/entities/user.entity';
import { TaskRatingEntity } from '../task-ratings/entities/task-rating.entity';
import { TaskStatus } from '../../shared/enums/task-status.enum';

export interface ReportFilters {
  branchId?: string;
  departmentId?: string;
  dateFrom?: string;
  dateTo?: string;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly taskRepo: Repository<TaskEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(TaskRatingEntity)
    private readonly ratingRepo: Repository<TaskRatingEntity>,
  ) {}

  // GET /reports/task-summary — counts by status/priority/department
  async taskSummary(filters: ReportFilters) {
    const base = this.taskRepo.createQueryBuilder('task');
    this.applyTaskFilters(base, filters);

    const byStatus = await base
      .clone()
      .select('task.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('task.status')
      .getRawMany();

    const byPriority = await base
      .clone()
      .select('task.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .groupBy('task.priority')
      .getRawMany();

    const byDepartment = await base
      .clone()
      .leftJoin('task.department', 'department')
      .select('department.name', 'department')
      .addSelect('COUNT(*)', 'count')
      .groupBy('department.name')
      .getRawMany();

    return { byStatus, byPriority, byDepartment };
  }

  // GET /reports/user-performance — completion rate, avg rating, overdue count per User
  async userPerformance(filters: ReportFilters) {
    const usersQb = this.userRepo.createQueryBuilder('user');
    if (filters.branchId) usersQb.andWhere('user.branchId = :branchId', { branchId: filters.branchId });
    if (filters.departmentId) usersQb.andWhere('user.departmentId = :departmentId', { departmentId: filters.departmentId });
    const users = await usersQb.getMany();

    const today = new Date().toISOString().slice(0, 10);

    const results = await Promise.all(
      users.map(async (user) => {
        const assignedTotal = await this.taskRepo
          .createQueryBuilder('task')
          .where('task.assignedToId = :userId', { userId: user.id })
          .getCount();

        const completed = await this.taskRepo
          .createQueryBuilder('task')
          .where('task.assignedToId = :userId', { userId: user.id })
          .andWhere('task.status = :status', { status: TaskStatus.COMPLETED })
          .getCount();

        const overdue = await this.taskRepo
          .createQueryBuilder('task')
          .where('task.assignedToId = :userId', { userId: user.id })
          .andWhere('task.deadlineDate < :today', { today })
          .andWhere('task.status NOT IN (:...done)', {
            done: [TaskStatus.COMPLETED, TaskStatus.CANCELLED, TaskStatus.ARCHIVED],
          })
          .getCount();

        const ratingAvg = await this.ratingRepo
          .createQueryBuilder('rating')
          .innerJoin('rating.task', 'task')
          .where('task.assignedToId = :userId', { userId: user.id })
          .select('AVG(rating.score)', 'avg')
          .getRawOne();

        return {
          userId: user.id,
          fullName: user.fullName,
          assignedTotal,
          completed,
          completionRate: assignedTotal > 0 ? Math.round((completed / assignedTotal) * 100) : 0,
          overdue,
          averageRating: ratingAvg?.avg ? parseFloat(parseFloat(ratingAvg.avg).toFixed(2)) : null,
        };
      }),
    );

    return results;
  }

  // GET /reports/branch-overview — aggregated metrics per Branch.
  // Branch has no relation of its own; Task carries branchId directly, so
  // this joins straight from Task to Branch (no Department hop needed).
  async branchOverview() {
    const raw = await this.taskRepo
      .createQueryBuilder('task')
      .leftJoin('task.branch', 'branch')
      .where('task.branchId IS NOT NULL')
      .select('branch.id', 'branchId')
      .addSelect('branch.name', 'branchName')
      .addSelect('COUNT(*)', 'totalTasks')
      .addSelect(
        `COUNT(*) FILTER (WHERE task.status = '${TaskStatus.COMPLETED}')`,
        'completedTasks',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE task.deadline_date < CURRENT_DATE AND task.status NOT IN ('${TaskStatus.COMPLETED}','${TaskStatus.CANCELLED}','${TaskStatus.ARCHIVED}'))`,
        'overdueTasks',
      )
      .groupBy('branch.id')
      .addGroupBy('branch.name')
      .getRawMany();

    return raw;
  }

  private applyTaskFilters(qb: ReturnType<Repository<TaskEntity>['createQueryBuilder']>, filters: ReportFilters) {
    if (filters.departmentId) qb.andWhere('task.departmentId = :departmentId', { departmentId: filters.departmentId });
    if (filters.branchId) qb.andWhere('task.branchId = :branchId', { branchId: filters.branchId });
    if (filters.dateFrom && filters.dateTo) {
      qb.andWhere('task.createdAt BETWEEN :from AND :to', { from: filters.dateFrom, to: filters.dateTo });
    }
  }
}
