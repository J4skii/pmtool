import { Inject, Injectable } from '@nestjs/common';
import { AppError, ERROR_CODES, hasPermission } from '@flowos/shared';
import type { Comment, Prisma } from '@flowos/database';
import { PRISMA, type Db } from '../../common/prisma.provider';
import { AuditService } from '../../common/services/audit.service';
import type { JwtPayload } from '../../common/types';
import { RealtimeService } from '../realtime/realtime.service';
import type { CreateCommentInput, ListCommentsQuery, UpdateCommentInput } from './comments.dto';

type CommentRow = Prisma.CommentGetPayload<{
  include: { author: { select: { id: true; firstName: true; lastName: true; avatarUrl: true } } };
}>;

const COMMENT_INCLUDE = {
  author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
} satisfies Prisma.CommentInclude;

@Injectable()
export class CommentsService {
  constructor(
    @Inject(PRISMA) private readonly db: Db,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
  ) {}

  async list(tenantId: string, query: ListCommentsQuery): Promise<CommentRow[]> {
    return this.db.comment.findMany({
      where: { tenantId, entityType: query.entityType, entityId: query.entityId, deletedAt: null },
      include: COMMENT_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(tenantId: string, authorId: string, input: CreateCommentInput): Promise<CommentRow> {
    const comment = await this.db.comment.create({
      data: {
        tenantId,
        authorId,
        entityType: input.entityType,
        entityId: input.entityId,
        body: input.body as Prisma.InputJsonValue,
        mentions: input.mentions,
        parentId: input.parentId,
        annotation: (input.annotation ?? undefined) as Prisma.InputJsonValue | undefined,
      },
      include: COMMENT_INCLUDE,
    });

    // Fan out notifications to mentioned users (deduped, excluding author).
    const mentioned = [...new Set(input.mentions)].filter((id) => id !== authorId);
    if (mentioned.length > 0) {
      await this.db.notification.createMany({
        data: mentioned.map((userId) => ({
          tenantId,
          userId,
          type: 'mention',
          title: `${comment.author.firstName} ${comment.author.lastName} mentioned you`,
          link: { entityType: input.entityType, entityId: input.entityId } as Prisma.InputJsonValue,
        })),
      });
      for (const userId of mentioned) {
        this.realtime.emitToUser(tenantId, userId, 'notification.created', { type: 'mention' });
      }
    }

    this.realtime.emitToTenant(tenantId, 'comment.created', {
      entityType: input.entityType,
      entityId: input.entityId,
      commentId: comment.id,
    });
    this.audit.writeAudit({ tenantId, userId: authorId, action: 'comment.created', entityType: input.entityType, entityId: input.entityId });
    return comment;
  }

  async update(tenantId: string, actor: JwtPayload, commentId: string, input: UpdateCommentInput): Promise<Comment> {
    const comment = await this.requireOwnOrModerator(tenantId, actor, commentId);
    return this.db.comment.update({
      where: { id: comment.id },
      data: {
        body: input.body as Prisma.InputJsonValue,
        ...(input.mentions !== undefined ? { mentions: input.mentions } : {}),
      },
    });
  }

  async softDelete(tenantId: string, actor: JwtPayload, commentId: string): Promise<{ id: string }> {
    const comment = await this.requireOwnOrModerator(tenantId, actor, commentId);
    await this.db.comment.update({ where: { id: comment.id }, data: { deletedAt: new Date() } });
    this.audit.writeAudit({ tenantId, userId: actor.sub, action: 'comment.deleted', entityType: 'comment', entityId: commentId });
    return { id: commentId };
  }

  /** Authors may edit their own comments; comments.moderate may edit any. */
  private async requireOwnOrModerator(tenantId: string, actor: JwtPayload, commentId: string): Promise<Comment> {
    const comment = await this.db.comment.findFirst({ where: { id: commentId, tenantId, deletedAt: null } });
    if (!comment) throw new AppError(ERROR_CODES.NOT_FOUND, 'Comment not found', 404);
    if (comment.authorId !== actor.sub && !hasPermission(actor.permissions, 'comments.moderate')) {
      throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'You can only modify your own comments', 403);
    }
    return comment;
  }
}
