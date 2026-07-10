import { Inject, Injectable } from '@nestjs/common';
import { AppError, ERROR_CODES, hasPermission, type CreateTimeEntryInput, type Paginated } from '@flowos/shared';
import type { Prisma, TimeEntry } from '@flowos/database';
import { PRISMA, type Db } from '../../common/prisma.provider';
import { AuditService } from '../../common/services/audit.service';
import type { JwtPayload } from '../../common/types';
import type { ListEntriesQuery, StartTimerInput } from './time.dto';

export interface WeeklySummary {
  weekStart: string;
  totalMins: number;
  billableMins: number;
  byProject: Array<{ projectId: string; projectName: string; mins: number }>;
}

@Injectable()
export class TimeService {
  constructor(
    @Inject(PRISMA) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  async startTimer(tenantId: string, userId: string, input: StartTimerInput): Promise<TimeEntry> {
    const running = await this.db.timeEntry.findFirst({
      where: { tenantId, userId, endedAt: null, deletedAt: null },
    });
    if (running) {
      throw new AppError(ERROR_CODES.TIMER_ALREADY_RUNNING, 'Stop the current timer before starting a new one', 409);
    }

    const project = await this.db.project.findFirst({
      where: { id: input.projectId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!project) throw new AppError(ERROR_CODES.NOT_FOUND, 'Project not found', 404);

    return this.db.timeEntry.create({
      data: {
        tenantId,
        userId,
        projectId: input.projectId,
        taskId: input.taskId,
        note: input.note,
        billable: input.billable,
        startedAt: new Date(),
        billRateCents: await this.snapshotBillRate(tenantId, userId),
      },
    });
  }

  async stopTimer(tenantId: string, userId: string): Promise<TimeEntry> {
    const running = await this.db.timeEntry.findFirst({
      where: { tenantId, userId, endedAt: null, deletedAt: null },
    });
    if (!running) throw new AppError(ERROR_CODES.NOT_FOUND, 'No running timer', 404);

    const endedAt = new Date();
    const durationMins = Math.max(1, Math.round((endedAt.getTime() - running.startedAt.getTime()) / 60_000));
    const entry = await this.db.timeEntry.update({
      where: { id: running.id },
      data: { endedAt, durationMins },
    });
    this.audit.writeAudit({ tenantId, userId, action: 'time.timer_stopped', entityType: 'timeEntry', entityId: entry.id });
    return entry;
  }

  async currentTimer(tenantId: string, userId: string): Promise<TimeEntry | null> {
    return this.db.timeEntry.findFirst({
      where: { tenantId, userId, endedAt: null, deletedAt: null },
      include: { project: { select: { id: true, name: true } }, task: { select: { id: true, title: true } } },
    });
  }

  async createManual(tenantId: string, userId: string, input: CreateTimeEntryInput): Promise<TimeEntry> {
    if (!input.endedAt && !input.durationMins) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, 'Manual entries need endedAt or durationMins', 422);
    }
    const durationMins =
      input.durationMins ??
      Math.max(1, Math.round(((input.endedAt as Date).getTime() - input.startedAt.getTime()) / 60_000));

    return this.db.timeEntry.create({
      data: {
        tenantId,
        userId,
        projectId: input.projectId,
        taskId: input.taskId,
        startedAt: input.startedAt,
        endedAt: input.endedAt ?? new Date(input.startedAt.getTime() + durationMins * 60_000),
        durationMins,
        note: input.note,
        billable: input.billable,
        billRateCents: await this.snapshotBillRate(tenantId, userId),
      },
    });
  }

  async listEntries(tenantId: string, actor: JwtPayload, query: ListEntriesQuery): Promise<Paginated<TimeEntry>> {
    // Viewing anyone else's entries requires time.read_all.
    const targetUserId =
      query.userId && query.userId !== actor.sub
        ? hasPermission(actor.permissions, 'time.read_all')
          ? query.userId
          : (() => {
              throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'time.read_all required to view others', 403);
            })()
        : (query.userId ?? actor.sub);

    const where: Prisma.TimeEntryWhereInput = {
      tenantId,
      userId: targetUserId,
      deletedAt: null,
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.billable !== undefined ? { billable: query.billable } : {}),
      ...(query.from || query.to
        ? { startedAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } }
        : {}),
    };

    const [items, total] = await this.db.$transaction([
      this.db.timeEntry.findMany({
        where,
        include: { project: { select: { id: true, name: true } }, task: { select: { id: true, title: true } } },
        orderBy: { startedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.db.timeEntry.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async weeklySummary(tenantId: string, userId: string): Promise<WeeklySummary> {
    const now = new Date();
    const weekStart = new Date(now);
    // Monday-start week in UTC.
    const day = (weekStart.getUTCDay() + 6) % 7;
    weekStart.setUTCDate(weekStart.getUTCDate() - day);
    weekStart.setUTCHours(0, 0, 0, 0);

    const entries = await this.db.timeEntry.findMany({
      where: { tenantId, userId, deletedAt: null, startedAt: { gte: weekStart }, durationMins: { not: null } },
      include: { project: { select: { id: true, name: true } } },
    });

    const byProject = new Map<string, { projectId: string; projectName: string; mins: number }>();
    let totalMins = 0;
    let billableMins = 0;
    for (const e of entries) {
      const mins = e.durationMins ?? 0;
      totalMins += mins;
      if (e.billable) billableMins += mins;
      const agg = byProject.get(e.projectId) ?? { projectId: e.projectId, projectName: e.project.name, mins: 0 };
      agg.mins += mins;
      byProject.set(e.projectId, agg);
    }

    return { weekStart: weekStart.toISOString(), totalMins, billableMins, byProject: [...byProject.values()] };
  }

  /** Bill-rate snapshot from the user's membership at entry time. */
  private async snapshotBillRate(tenantId: string, userId: string): Promise<number | null> {
    const membership = await this.db.membership.findFirst({
      where: { tenantId, userId, deletedAt: null },
      select: { billRateCents: true },
    });
    return membership?.billRateCents ?? null;
  }
}
