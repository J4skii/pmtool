import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA, type Db } from '../prisma.provider';

export interface AuditEntry {
  tenantId?: string | null;
  userId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Append-only compliance audit trail. Writes are fire-and-forget: an audit
 * failure must never fail the business operation, but is always logged.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@Inject(PRISMA) private readonly db: Db) {}

  writeAudit(entry: AuditEntry): void {
    void this.db.auditLog
      .create({
        data: {
          tenantId: entry.tenantId ?? null,
          userId: entry.userId ?? null,
          action: entry.action,
          entityType: entry.entityType ?? null,
          entityId: entry.entityId ?? null,
          ip: entry.ip ?? null,
          userAgent: entry.userAgent ?? null,
          metadata: (entry.metadata ?? {}) as object,
        },
      })
      .catch((err: unknown) => {
        this.logger.error(`Failed to write audit log (${entry.action}): ${err instanceof Error ? err.message : String(err)}`);
      });
  }
}
