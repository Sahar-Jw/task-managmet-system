import {
  Injectable,
  Logger,
} from '@nestjs/common';

import {
  Cron,
  CronExpression,
} from '@nestjs/schedule';

import {
  InjectRepository,
} from '@nestjs/typeorm';

import {
  Repository,
} from 'typeorm';

import {
  TaskEntity,
} from './entities/task.entity';

import {
  TaskStatus,
} from '../../shared/enums/task-status.enum';

import {
  NotificationType,
} from '../../shared/enums/notification-type.enum';

import {
  NotificationsService,
} from '../notifications/notifications.service';

import {
  formatTaskDetails,
} from '../../shared/utils/task-notification.util';


/*
 * =============================================================
 * TASK OVERDUE NOTIFICATIONS
 * =============================================================
 *
 * Runs periodically and notifies each Task's creator (owner) the
 * first time their Task becomes overdue — deadline passed while
 * the Task is still not Completed/Finished/Archived.
 *
 * `overdueNotifiedAt` on the Task remembers that the notification
 * was already sent, so a Task is only ever notified about once
 * (unless its deadline is pushed out and back again — see below).
 */
@Injectable()
export class TaskOverdueCron {
  private readonly logger =
    new Logger(
      TaskOverdueCron.name,
    );

  constructor(
    @InjectRepository(
      TaskEntity,
    )
    private readonly taskRepo:
      Repository<TaskEntity>,

    private readonly notificationsService:
      NotificationsService,
  ) {}


  /*
   * Runs once an hour. Overdue-ness only changes at day
   * granularity (deadlineDate is a DATE column), so this is
   * frequent enough to notify promptly after midnight without
   * hammering the database.
   */
  @Cron(
    CronExpression.EVERY_HOUR,
  )
  async notifyOverdueTasks(): Promise<void> {
    const todayIso =
      new Date()
        .toISOString()
        .slice(
          0,
          10,
        );

    const overdueTasks =
      await this.taskRepo
        .createQueryBuilder(
          'task',
        )
        .where(
          'task.deadlineDate IS NOT NULL',
        )
        .andWhere(
          'task.deadlineDate < :today',
          {
            today:
              todayIso,
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
        .andWhere(
          'task.overdueNotifiedAt IS NULL',
        )
        .getMany();

    for (
      const task of overdueTasks
    ) {
      try {
        await this.notificationsService.dispatch({
          recipientId:
            task.createdById,

          type:
            NotificationType.TASK_OVERDUE,

          title:
            'Task overdue',

          message:
            `"${task.title}" is overdue.${formatTaskDetails(task)}`,

          metadata: {
            taskId:
              task.id,

            taskTitle:
              task.title,

            priority:
              task.priority,

            dueDate:
              task.deadlineDate,
          },
        });

        await this.taskRepo.update(
          task.id,
          {
            overdueNotifiedAt:
              new Date(),
          },
        );
      } catch (
        error
      ) {
        /*
         * One Task failing to notify (e.g. a deleted creator)
         * should never stop the rest of the batch.
         */
        this.logger.error(
          `Failed to send overdue notification for Task ${task.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}
