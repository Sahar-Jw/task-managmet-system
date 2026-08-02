import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

@Injectable()
export class NotificationsService {
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
    return this.notificationRepo.save(
      this.notificationRepo.create({
        recipientId: params.recipientId,
        type: params.type,
        title: params.title,
        message: params.message,
        metadata: params.metadata,
        isRead: false,
      }),
    );
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
