import { Inject, Injectable } from '@nestjs/common';
import { AppError, ERROR_CODES, type Paginated, type PaginationInput } from '@flowos/shared';
import type { Notification, Prisma } from '@flowos/database';
import { PRISMA, type Db } from '../../common/prisma.provider';

@Injectable()
export class NotificationsService {
  constructor(@Inject(PRISMA) private readonly db: Db) {}

  async list(
    tenantId: string,
    userId: string,
    query: PaginationInput,
    unreadOnly: boolean,
  ): Promise<Paginated<Notification> & { unreadCount: number }> {
    const where: Prisma.NotificationWhereInput = {
      tenantId,
      userId,
      ...(unreadOnly ? { readAt: null } : {}),
    };

    const [items, total, unreadCount] = await this.db.$transaction([
      this.db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.db.notification.count({ where }),
      this.db.notification.count({ where: { tenantId, userId, readAt: null } }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize, unreadCount };
  }

  async markRead(tenantId: string, userId: string, notificationId: string): Promise<Notification> {
    const notification = await this.db.notification.findFirst({
      where: { id: notificationId, tenantId, userId },
    });
    if (!notification) throw new AppError(ERROR_CODES.NOT_FOUND, 'Notification not found', 404);
    return this.db.notification.update({ where: { id: notificationId }, data: { readAt: new Date() } });
  }

  async markAllRead(tenantId: string, userId: string): Promise<{ updated: number }> {
    const result = await this.db.notification.updateMany({
      where: { tenantId, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }
}
