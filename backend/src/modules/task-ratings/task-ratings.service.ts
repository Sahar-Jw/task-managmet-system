import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { appError } from '../../common/errors/app-error';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskRatingEntity } from './entities/task-rating.entity';
import { TaskEntity } from '../tasks/entities/task.entity';
import { TaskAssignmentEntity } from '../task-assignments/entities/task-assignment.entity';
import { UserEntity } from '../users/entities/user.entity';
import { RateTaskDto } from './dto/task-rating.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { TaskStatus } from '../../shared/enums/task-status.enum';
import { RoleName } from '../../shared/enums/role.enum';
import { AuditAction } from '../../shared/enums/audit-action.enum';

@Injectable()
export class TaskRatingsService {
  constructor(
    @InjectRepository(TaskRatingEntity)
    private readonly ratingRepo: Repository<TaskRatingEntity>,
    @InjectRepository(TaskEntity)
    private readonly taskRepo: Repository<TaskEntity>,
    @InjectRepository(TaskAssignmentEntity)
    private readonly assignmentRepo: Repository<TaskAssignmentEntity>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  findForTask(taskId: string) {
    return this.ratingRepo.find({ where: { taskId }, relations: ['ratedBy'] });
  }

  // BR-054: only after Completed. BR-055: creator or Admin, not the Assignee.
  // BR-056: upsert — one rating per rater. BR-058: cannot modify if archived.
  async rate(taskId: string, dto: RateTaskDto, actor: UserEntity): Promise<TaskRatingEntity> {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException(appError('TASK_NOT_FOUND', 'Task not found'));

    if (task.status !== TaskStatus.COMPLETED) {
      throw new ConflictException(appError('TASK_CAN_ONLY_RATED_ONCE_IT_REACHES_COMPLETED_STATUS', 'A Task can only be rated once it reaches Completed status')); // BR-054
    }
    if (task.archivedAt) {
      throw new ConflictException(appError('CANNOT_MODIFY_RATING_ONCE_TASK_ARCHIVED', 'Cannot modify a rating once the Task is archived')); // BR-058
    }

    const isCreator = task.createdById === actor.id;
    const isAdmin = actor.role.name === RoleName.ADMIN;
    if (!isCreator && !isAdmin) {
      throw new ForbiddenException(appError('ONLY_TASK_CREATOR_ADMIN_MAY_RATE_COMPLETED_TASK', 'Only the Task creator or Admin may rate a completed Task')); // BR-055
    }

    const isAssignee = await this.assignmentRepo.exist({
      where: { taskId, assigneeId: actor.id },
    });
    if (isAssignee && !isAdmin) {
      throw new ForbiddenException(appError('ASSIGNEE_CANNOT_RATE_THEIR_OWN_COMPLETED_WORK', 'The Assignee cannot rate their own completed work')); // BR-055
    }

    let rating = await this.ratingRepo.findOne({ where: { taskId, ratedById: actor.id } });
    const isUpdate = !!rating;

    if (rating) {
      rating.score = dto.score;
      rating.feedback = dto.feedback;
    } else {
      rating = this.ratingRepo.create({
        taskId,
        ratedById: actor.id,
        score: dto.score,
        feedback: dto.feedback,
      });
    }

    const saved = await this.ratingRepo.save(rating); // BR-057 enforced by DB CHECK + DTO validators

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'TaskRating',
      entityId: saved.id,
      action: isUpdate ? AuditAction.UPDATE : AuditAction.CREATE,
      newValue: saved,
    });

    // BR-059: rating a Task does not alter the Task's status — intentionally
    // no task.status mutation here.
    return saved;
  }
}
