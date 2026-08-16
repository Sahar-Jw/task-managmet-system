import {
  ForbiddenException,
  Injectable,
  MessageEvent,
  NotFoundException,
} from '@nestjs/common';

import {
  InjectRepository,
} from '@nestjs/typeorm';

import {
  Repository,
} from 'typeorm';

import {
  Observable,
  Subject,
  interval,
  merge,
} from 'rxjs';

import {
  filter,
  map,
} from 'rxjs/operators';

import {
  NotificationEntity,
} from './entities/notification.entity';

import {
  NotificationType,
} from '../../shared/enums/notification-type.enum';

import {
  PaginationQueryDto,
} from '../../common/utils/pagination.dto';


/*
 * ============================================================
 * TYPES
 * ============================================================
 */

export interface DispatchNotificationParams {
  recipientId: string;

  type: NotificationType;

  title: string;

  message: string;

  metadata?:
    Record<
      string,
      any
    >;

  /*
   * Optional protection against accidentally creating the same
   * notification several times in a very short period.
   *
   * Useful for scheduled deadline/overdue jobs.
   */
  dedupeKey?:
    string;

  dedupeWindowMinutes?:
    number;
}


export interface DispatchManyNotificationParams {
  recipientIds:
    string[];

  type:
    NotificationType;

  title:
    string;

  message:
    string;

  metadata?:
    Record<
      string,
      any
    >;

  dedupeKey?:
    string;

  dedupeWindowMinutes?:
    number;
}


export interface FindNotificationsQuery
  extends PaginationQueryDto {
  unreadOnly?:
    boolean;
}


/*
 * ============================================================
 * CONFIG
 * ============================================================
 */

const SSE_HEARTBEAT_MS =
  20_000;


const DEFAULT_DEDUPE_WINDOW_MINUTES =
  5;


/*
 * ============================================================
 * SERVICE
 * ============================================================
 */

@Injectable()
export class NotificationsService {
  /*
   * ==========================================================
   * REAL-TIME EVENT BUS
   * ==========================================================
   *
   * This works correctly for the current single API process.
   *
   * If the backend is later horizontally scaled to multiple
   * API instances, replace this Subject with Redis pub/sub or
   * another shared message broker.
   * ==========================================================
   */

  private readonly notificationCreated$ =
    new Subject<{
      userId:
        string;

      notification:
        NotificationEntity;
    }>();


  constructor(
    @InjectRepository(
      NotificationEntity,
    )
    private readonly notificationRepo:
      Repository<NotificationEntity>,
  ) {}


  /*
   * ==========================================================
   * SANITIZE METADATA
   * ==========================================================
   *
   * Notification metadata should only contain navigation /
   * presentation information.
   *
   * Never place passwords, tokens, whole User objects, etc.
   * inside notification metadata.
   * ==========================================================
   */

  private sanitizeMetadata(
    metadata?:
      Record<
        string,
        any
      >,
  ):
    | Record<
        string,
        any
      >
    | undefined {
    if (!metadata) {
      return undefined;
    }


    const allowedKeys =
      new Set([
        'taskId',
        'taskTitle',

        'projectId',
        'projectName',

        'assignmentId',

        'commentId',

        'approvalId',

        'actorId',
        'actorName',

        'status',
        'previousStatus',

        'dueDate',
        'previousDueDate',

        'reason',

        'dedupeKey',
      ]);


    const result:
      Record<
        string,
        any
      > = {};


    for (
      const [
        key,
        value,
      ] of Object.entries(
        metadata,
      )
    ) {
      if (
        !allowedKeys.has(
          key,
        )
      ) {
        continue;
      }


      /*
       * Metadata should stay simple.
       */
      if (
        value ===
          null ||
        value ===
          undefined
      ) {
        continue;
      }


      if (
        typeof value ===
          'string' ||
        typeof value ===
          'number' ||
        typeof value ===
          'boolean'
      ) {
        result[
          key
        ] =
          value;
      }
    }


    return Object.keys(
      result,
    ).length
      ? result
      : undefined;
  }


  /*
   * ==========================================================
   * DUPLICATE CHECK
   * ==========================================================
   */

  private async hasRecentDuplicate(
    params:
      DispatchNotificationParams,
  ): Promise<boolean> {
    if (
      !params.dedupeKey
    ) {
      return false;
    }


    const windowMinutes =
      Math.max(
        1,
        params.dedupeWindowMinutes ??
          DEFAULT_DEDUPE_WINDOW_MINUTES,
      );


    const since =
      new Date(
        Date.now() -
          windowMinutes *
            60 *
            1000,
      );


    /*
     * mysql JSON ->> operator.
     *
     * The entity currently stores metadata as JSON, which lets
     * us safely check the dedupe key without adding another DB
     * column.
     */
    const existing =
      await this.notificationRepo
        .createQueryBuilder(
          'notification',
        )
        .where(
          'notification.recipientId = :recipientId',
          {
            recipientId:
              params.recipientId,
          },
        )
        .andWhere(
          'notification.type = :type',
          {
            type:
              params.type,
          },
        )
        .andWhere(
          `notification.metadata ->> 'dedupeKey' = :dedupeKey`,
          {
            dedupeKey:
              params.dedupeKey,
          },
        )
        .andWhere(
          'notification.createdAt >= :since',
          {
            since,
          },
        )
        .getOne();


    return Boolean(
      existing,
    );
  }


  /*
   * ==========================================================
   * DISPATCH
   * ==========================================================
   */

  async dispatch(
    params:
      DispatchNotificationParams,
  ): Promise<NotificationEntity> {
    /*
     * ========================================================
     * DEDUPLICATION
     * ========================================================
     */

    if (
      params.dedupeKey &&
      await this.hasRecentDuplicate(
        params,
      )
    ) {
      const existing =
        await this.notificationRepo
          .createQueryBuilder(
            'notification',
          )
          .where(
            'notification.recipientId = :recipientId',
            {
              recipientId:
                params.recipientId,
            },
          )
          .andWhere(
            'notification.type = :type',
            {
              type:
                params.type,
            },
          )
          .andWhere(
            `notification.metadata ->> 'dedupeKey' = :dedupeKey`,
            {
              dedupeKey:
                params.dedupeKey,
            },
          )
          .orderBy(
            'notification.createdAt',
            'DESC',
          )
          .getOne();


      if (existing) {
        return existing;
      }
    }


    /*
     * ========================================================
     * METADATA
     * ========================================================
     */

    const metadata =
      this.sanitizeMetadata({
        ...params.metadata,

        ...(params.dedupeKey
          ? {
              dedupeKey:
                params.dedupeKey,
            }
          : {}),
      });


    /*
     * ========================================================
     * CREATE
     * ========================================================
     */

    const notification =
      await this.notificationRepo.save(
        this.notificationRepo.create({
          recipientId:
            params.recipientId,

          type:
            params.type,

          title:
            params.title.trim(),

          message:
            params.message.trim(),

          metadata,

          isRead:
            false,
        }),
      );


    /*
     * ========================================================
     * REAL-TIME PUSH
     * ========================================================
     */

    this.notificationCreated$.next({
      userId:
        params.recipientId,

      notification,
    });


    return notification;
  }


  /*
   * ==========================================================
   * DISPATCH MANY
   * ==========================================================
   *
   * Use this when the same event needs to notify several Users.
   *
   * Example:
   *
   * - Task completed -> creator + project owner
   * - Project archived -> relevant project members
   *
   * Duplicate recipient IDs are removed automatically.
   * ==========================================================
   */

  async dispatchMany(
    params:
      DispatchManyNotificationParams,
  ): Promise<NotificationEntity[]> {
    const recipientIds =
      Array.from(
        new Set(
          params.recipientIds.filter(
            Boolean,
          ),
        ),
      );


    if (
      recipientIds.length ===
      0
    ) {
      return [];
    }


    const results:
      NotificationEntity[] = [];


    /*
     * We intentionally call dispatch() instead of bulk inserting
     * so every Notification also emits its SSE event.
     */
    for (
      const recipientId
      of recipientIds
    ) {
      const notification =
        await this.dispatch({
          recipientId,

          type:
            params.type,

          title:
            params.title,

          message:
            params.message,

          metadata:
            params.metadata,

          dedupeKey:
            params.dedupeKey,

          dedupeWindowMinutes:
            params.dedupeWindowMinutes,
        });


      results.push(
        notification,
      );
    }


    return results;
  }


  /*
   * ==========================================================
   * SSE STREAM
   * ==========================================================
   */

  stream(
    userId:
      string,
  ): Observable<MessageEvent> {
    const created$ =
      this.notificationCreated$.pipe(
        filter(
          (
            event,
          ) =>
            event.userId ===
            userId,
        ),

        map(
          (
            event,
          ) =>
            ({
              type:
                'notification',

              data:
                event.notification,
            }) as MessageEvent,
        ),
      );


    const heartbeat$ =
      interval(
        SSE_HEARTBEAT_MS,
      ).pipe(
        map(
          () =>
            ({
              type:
                'ping',

              data: {},
            }) as MessageEvent,
        ),
      );


    return merge(
      created$,
      heartbeat$,
    );
  }


  /*
   * ==========================================================
   * FIND FOR USER
   * ==========================================================
   */

  async findForUser(
    userId:
      string,

    query:
      FindNotificationsQuery,
  ) {
    const page =
      Math.max(
        1,
        query.page ??
          1,
      );


    const limit =
      Math.min(
        100,
        Math.max(
          1,
          query.limit ??
            20,
        ),
      );


    const qb =
      this.notificationRepo
        .createQueryBuilder(
          'notification',
        )
        .where(
          'notification.recipientId = :userId',
          {
            userId,
          },
        );


    if (
      query.unreadOnly
    ) {
      qb.andWhere(
        'notification.isRead = false',
      );
    }


    qb
      .orderBy(
        'notification.createdAt',
        'DESC',
      )
      .addOrderBy(
        'notification.id',
        'DESC',
      )
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
      items,
      total,
      page,
      limit,
    };
  }


  /*
   * ==========================================================
   * UNREAD COUNT
   * ==========================================================
   */

  async getUnreadCount(
    userId:
      string,
  ) {
    const count =
      await this.notificationRepo.count({
        where: {
          recipientId:
            userId,

          isRead:
            false,
        },
      });


    return {
      count,
    };
  }


  /*
   * ==========================================================
   * MARK ONE READ
   * ==========================================================
   */

  async markRead(
    id:
      string,

    userId:
      string,
  ): Promise<NotificationEntity> {
    const notification =
      await this.notificationRepo.findOne({
        where: {
          id,
        },
      });


    if (
      !notification
    ) {
      throw new NotFoundException(
        'Notification not found',
      );
    }


    if (
      notification.recipientId !==
      userId
    ) {
      throw new ForbiddenException(
        'You may only manage your own Notifications',
      );
    }


    /*
     * Idempotent.
     *
     * Do not overwrite the original read timestamp every time
     * the frontend accidentally calls markRead again.
     */
    if (
      notification.isRead
    ) {
      return notification;
    }


    notification.isRead =
      true;


    notification.readAt =
      new Date();


    return this.notificationRepo.save(
      notification,
    );
  }


  /*
   * ==========================================================
   * MARK ALL READ
   * ==========================================================
   */

  async markAllRead(
    userId:
      string,
  ): Promise<{
    updated:
      number;
  }> {
    const result =
      await this.notificationRepo
        .createQueryBuilder()
        .update(
          NotificationEntity,
        )
        .set({
          isRead:
            true,

          readAt:
            new Date(),
        })
        .where(
          'recipientId = :userId',
          {
            userId,
          },
        )
        .andWhere(
          'isRead = false',
        )
        .execute();


    return {
      updated:
        result.affected ??
        0,
    };
  }


  /*
   * ==========================================================
   * DELETE ONE
   * ==========================================================
   */

  async remove(
    id:
      string,

    userId:
      string,
  ): Promise<{
    deleted:
      boolean;
  }> {
    const notification =
      await this.notificationRepo.findOne({
        where: {
          id,
        },
      });


    if (
      !notification
    ) {
      throw new NotFoundException(
        'Notification not found',
      );
    }


    if (
      notification.recipientId !==
      userId
    ) {
      throw new ForbiddenException(
        'You may only manage your own Notifications',
      );
    }


    await this.notificationRepo.remove(
      notification,
    );


    return {
      deleted:
        true,
    };
  }


  /*
   * ==========================================================
   * CLEAR READ NOTIFICATIONS
   * ==========================================================
   *
   * This deliberately deletes ONLY read notifications.
   *
   * Unread notifications are kept so a User cannot accidentally
   * clear important unseen activity with one click.
   * ==========================================================
   */

  async clearRead(
    userId:
      string,
  ): Promise<{
    deleted:
      number;
  }> {
    const result =
      await this.notificationRepo
        .createQueryBuilder()
        .delete()
        .from(
          NotificationEntity,
        )
        .where(
          'recipientId = :userId',
          {
            userId,
          },
        )
        .andWhere(
          'isRead = true',
        )
        .execute();


    return {
      deleted:
        result.affected ??
        0,
    };
  }
}