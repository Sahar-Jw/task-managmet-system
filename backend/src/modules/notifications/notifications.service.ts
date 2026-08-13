import { ForbiddenException, Injectable, MessageEvent, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable, Subject, interval, merge } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationType } from '../../shared/enums/notification-type.enum';
import { PaginationQueryDto } from '../../common/utils/pagination.dto';

export interface DispatchNotificationParams {
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

// How often to send a comment/ping frame down each open SSE connection.
// Nothing but keep-alive noise — it exists purely so idle connections don't
// get silently dropped by browsers, load balancers, or reverse proxies that
// close connections after a period of no traffic (commonly ~30-60s).
const SSE_HEARTBEAT_MS = 20000;

@Injectable()
export class NotificationsService {
  // In-process pub/sub of newly-created Notifications, fanned out to each
  // recipient's open SSE stream (see `stream()` below) so the client finds
  // out the instant one is dispatched instead of waiting for the next poll.
  // Being in-process, this only reaches clients connected to *this*
  // instance — behind a load balancer with multiple API instances you'd
  // swap this for a shared pub/sub (Redis, etc.) so an event raised on one
  // instance still reaches a client connected to another.
  private readonly notificationCreated$ = new Subject<{
    userId: string;
    notification: NotificationEntity;
  }>();

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepo: Repository<NotificationEntity>,
  ) {}

  /**
   * BR-070: generates a Notification for the standard set of trigger events.
   * In a full deployment this would enqueue to a queue-based worker
   * (NFR-SCALE-03); here it writes directly for simplicity, leaving the
   * queue integration as a swap-in point (see NotificationsQueueAdapter).
   */
  async dispatch(params: DispatchNotificationParams): Promise<NotificationEntity> {
    const notification = await this.notificationRepo.save(
      this.notificationRepo.create({
        recipientId: params.recipientId,
        type: params.type,
        title: params.title,
        message: params.message,
        metadata: params.metadata,
        isRead: false,
      }),
    );
    this.notificationCreated$.next({ userId: params.recipientId, notification });
    return notification;
  }

  /**
   * SSE stream for one User: emits a `notification` event carrying the full
   * row every time `dispatch()` creates one for them, so the frontend can
   * update the badge/list instantly instead of waiting for the next poll.
   * Merged with a periodic `ping` so the connection stays alive while idle.
   */
  stream(userId: string): Observable<MessageEvent> {
    const created$ = this.notificationCreated$.pipe(
      filter((event) => event.userId === userId),
      map((event) => ({ type: 'notification', data: event.notification }) as MessageEvent),
    );
    const heartbeat$ = interval(SSE_HEARTBEAT_MS).pipe(
      map(() => ({ type: 'ping', data: {} }) as MessageEvent),
    );
    return merge(created$, heartbeat$);
  }

  // BR-071: a User can only view their own Notifications.
  async findForUser(userId: string, query: PaginationQueryDto & { unreadOnly?: boolean }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.notificationRepo
      .createQueryBuilder('n')
      .where('n.recipientId = :userId', { userId })
      .orderBy('n.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.unreadOnly) qb.andWhere('n.isRead = false');

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  // BR-072: marking as read does not delete it.
  async markRead(id: string, userId: string): Promise<NotificationEntity> {
    const notification = await this.notificationRepo.findOne({ where: { id } });
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.recipientId !== userId) {
      throw new ForbiddenException('You may only manage your own Notifications');
    }
    notification.isRead = true;
    notification.readAt = new Date();
    return this.notificationRepo.save(notification);
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notificationRepo
      .createQueryBuilder()
      .update(NotificationEntity)
      .set({ isRead: true, readAt: new Date() })
      .where('recipientId = :userId AND isRead = false', { userId })
      .execute();
  }

  // BR-072: deletion is a separate, explicit action.
  async remove(id: string, userId: string): Promise<void> {
    const notification = await this.notificationRepo.findOne({ where: { id } });
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.recipientId !== userId) {
      throw new ForbiddenException('You may only manage your own Notifications');
    }
    await this.notificationRepo.remove(notification);
  }
}