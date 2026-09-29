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
 *
 * DUPLICATE PROTECTION
 * --------------------
 * The flag is "claimed" with an atomic UPDATE *before* the
 * notification is sent:
 *
 *   UPDATE tasks SET overdue_notified_at = NOW()
 *   WHERE id = ? AND overdue_notified_at IS NULL
 *
 * Only one run/process can win that UPDATE (affectedRows = 1), so
 * even if two overlapping runs (or two backend instances) select
 * the same Task, only one of them will send the notification.
 * If sending fails, the claim is released so the next run retries.
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

    for (const task of overdueTasks) {
      /*
       * 1. CLAIM the Task first.
       *
       * Atomic: only one run can flip NULL -> timestamp.
       * If another run/process already claimed it, skip.
       */
      const claim =
        await this.taskRepo
          .createQueryBuilder()
          .update(TaskEntity)
          .set({
            overdueNotifiedAt: () => 'CURRENT_TIMESTAMP',
          })
          .where(
            'id = :id AND overdue_notified_at IS NULL',
            {
              id: task.id,
            },
          )
          .execute();

      if (!claim.affected) {
        continue;
      }

      try {
        /*
         * 2. SEND the notification.
         *
         * dedupeKey is a second safety net: even if the claim
         * were bypassed somehow, the same Task will not produce
         * a second overdue notification within a year.
         */
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

          dedupeKey:
            `task-overdue:${task.id}`,

          dedupeWindowMinutes:
            60 * 24 * 365,
        });
      } catch (
        error
      ) {
        /*
         * 3. RELEASE the claim so the next run can retry.
         *
         * One Task failing to notify (e.g. a deleted creator)
         * should never stop the rest of the batch.
         */
        try {
          await this.taskRepo.update(
            task.id,
            {
              overdueNotifiedAt:
                null as any,
            },
          );
        } catch (
          releaseError
        ) {
          this.logger.error(
            `Failed to release overdue claim for Task ${task.id}`,
            releaseError instanceof Error
              ? releaseError.stack
              : String(releaseError),
          );
        }

        this.logger.error(
          `Failed to send overdue notification for Task ${task.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}