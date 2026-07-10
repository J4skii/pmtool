import { Inject, Injectable } from '@nestjs/common';
import { AppError, ERROR_CODES, type CreateProjectInput, type Paginated, type UpdateProjectInput } from '@flowos/shared';
import type { Prisma, Project, ProjectMember, Stage } from '@flowos/database';
import { PRISMA, type Db } from '../../common/prisma.provider';
import { AuditService } from '../../common/services/audit.service';
import type {
  AddProjectMemberInput,
  CreateStageInput,
  ListProjectsQuery,
  ReorderStagesInput,
  UpdateStageInput,
} from './projects.dto';

export interface ProjectProgress {
  totalTasks: number;
  doneTasks: number;
  percent: number;
}

export interface ProjectBudget {
  currency: string;
  budgetCents: string | null;
  timeCents: string;
  expenseCents: string;
  actualCents: string;
  remainingCents: string | null;
}

type ProjectRow = Prisma.ProjectGetPayload<{
  include: { owner: { select: { id: true; firstName: true; lastName: true; avatarUrl: true } } };
}>;

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(PRISMA) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string, query: ListProjectsQuery): Promise<Paginated<ProjectRow>> {
    const where: Prisma.ProjectWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.db.$transaction([
      this.db.project.findMany({
        where,
        include: { owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
        orderBy: { createdAt: query.sortDir },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.db.project.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async getById(tenantId: string, projectId: string): Promise<Project> {
    return this.requireProject(tenantId, projectId, {
      stages: { where: { deletedAt: null }, orderBy: { order: 'asc' } },
      members: { where: { deletedAt: null }, include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } } },
    });
  }

  async create(tenantId: string, actorId: string, input: CreateProjectInput): Promise<Project> {
    const project = await this.db.project.create({
      data: {
        tenantId,
        name: input.name,
        code: input.code ?? null,
        description: input.description ?? null,
        status: input.status,
        color: input.color ?? null,
        ownerId: input.ownerId ?? actorId,
        templateId: input.templateId ?? null,
        startDate: input.startDate ?? null,
        dueDate: input.dueDate ?? null,
        budgetCents: input.budgetCents ?? null,
        currency: input.currency,
        customFields: input.customFields as object,
        clientVisible: input.clientVisible,
      },
    });

    await this.writeActivity(tenantId, actorId, project.id, 'project.created', { name: project.name });
    this.audit.writeAudit({ tenantId, userId: actorId, action: 'project.created', entityType: 'project', entityId: project.id });
    return project;
  }

  async update(tenantId: string, actorId: string, projectId: string, input: UpdateProjectInput): Promise<Project> {
    const existing = await this.requireProject(tenantId, projectId);
    const updated = await this.db.project.update({
      where: { id: existing.id },
      data: {
        ...input,
        customFields: input.customFields !== undefined ? (input.customFields as object) : undefined,
      },
    });

    const statusChanged = input.status !== undefined && input.status !== existing.status;
    await this.writeActivity(tenantId, actorId, projectId, statusChanged ? 'project.status_changed' : 'project.updated', {
      fields: Object.keys(input),
      ...(statusChanged ? { from: existing.status, to: input.status } : {}),
    });
    this.audit.writeAudit({ tenantId, userId: actorId, action: 'project.updated', entityType: 'project', entityId: projectId });
    return updated;
  }

  async remove(tenantId: string, actorId: string, projectId: string): Promise<{ id: string }> {
    const project = await this.requireProject(tenantId, projectId);
    await this.db.project.update({ where: { id: project.id }, data: { deletedAt: new Date() } });
    this.audit.writeAudit({ tenantId, userId: actorId, action: 'project.deleted', entityType: 'project', entityId: projectId });
    return { id: projectId };
  }

  async archive(tenantId: string, actorId: string, projectId: string): Promise<Project> {
    const project = await this.requireProject(tenantId, projectId);
    const updated = await this.db.project.update({ where: { id: project.id }, data: { status: 'ARCHIVED' } });
    await this.writeActivity(tenantId, actorId, projectId, 'project.status_changed', { from: project.status, to: 'ARCHIVED' });
    this.audit.writeAudit({ tenantId, userId: actorId, action: 'project.archived', entityType: 'project', entityId: projectId });
    return updated;
  }

  /**
   * Duplicate a project inside a single transaction: copies the project row,
   * its stages and its tasks (preserving stage placement and the subtask
   * hierarchy) but intentionally leaves assignees behind.
   */
  async duplicate(tenantId: string, actorId: string, projectId: string): Promise<Project> {
    const source = await this.requireProject(tenantId, projectId);
    const [stages, tasks] = await Promise.all([
      this.db.stage.findMany({ where: { projectId, deletedAt: null }, orderBy: { order: 'asc' } }),
      this.db.task.findMany({ where: { tenantId, projectId, deletedAt: null }, orderBy: { createdAt: 'asc' } }),
    ]);

    const copy = await this.db.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          tenantId,
          name: `${source.name} (Copy)`,
          code: null, // codes are unique per tenant; the copy starts without one
          description: source.description,
          status: 'PLANNING',
          color: source.color,
          ownerId: actorId,
          templateId: source.templateId,
          startDate: source.startDate,
          dueDate: source.dueDate,
          budgetCents: source.budgetCents,
          currency: source.currency,
          customFields: source.customFields as object,
          clientVisible: source.clientVisible,
        },
      });

      const stageIdMap = new Map<string, string>();
      for (const stage of stages) {
        const created = await tx.stage.create({
          data: { projectId: project.id, name: stage.name, key: stage.key, color: stage.color, order: stage.order, isDone: stage.isDone },
        });
        stageIdMap.set(stage.id, created.id);
      }

      // Two-pass copy so parentId references can be remapped after all rows exist.
      const taskIdMap = new Map<string, string>();
      for (const task of tasks) {
        const created = await tx.task.create({
          data: {
            tenantId,
            projectId: project.id,
            stageId: task.stageId ? (stageIdMap.get(task.stageId) ?? null) : null,
            title: task.title,
            description: task.description,
            priority: task.priority,
            order: task.order,
            startDate: task.startDate,
            dueDate: task.dueDate,
            estimateMins: task.estimateMins,
            customFields: task.customFields as object,
            recurrenceRule: task.recurrenceRule,
            isMilestone: task.isMilestone,
            clientVisible: task.clientVisible,
          },
        });
        taskIdMap.set(task.id, created.id);
      }
      for (const task of tasks) {
        if (task.parentId && taskIdMap.has(task.parentId)) {
          await tx.task.update({
            where: { id: taskIdMap.get(task.id) as string },
            data: { parentId: taskIdMap.get(task.parentId) as string },
          });
        }
      }

      return project;
    });

    await this.writeActivity(tenantId, actorId, copy.id, 'project.created', { duplicatedFrom: projectId });
    this.audit.writeAudit({ tenantId, userId: actorId, action: 'project.duplicated', entityType: 'project', entityId: copy.id, metadata: { sourceId: projectId } });
    return copy;
  }

  /** Percent of (non-deleted) tasks sitting in a stage flagged isDone. */
  async progress(tenantId: string, projectId: string): Promise<ProjectProgress> {
    await this.requireProject(tenantId, projectId);
    const [totalTasks, doneTasks] = await this.db.$transaction([
      this.db.task.count({ where: { tenantId, projectId, deletedAt: null } }),
      this.db.task.count({ where: { tenantId, projectId, deletedAt: null, stage: { isDone: true } } }),
    ]);
    return { totalTasks, doneTasks, percent: totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100) };
  }

  /** Budget vs actual: billable time at snapshot rates + approved expenses. */
  async budget(tenantId: string, projectId: string): Promise<ProjectBudget> {
    const project = await this.requireProject(tenantId, projectId);

    const entries = await this.db.timeEntry.findMany({
      where: { tenantId, projectId, deletedAt: null, billable: true, durationMins: { not: null } },
      select: { durationMins: true, billRateCents: true },
    });
    const timeCents = entries.reduce(
      (sum, e) => sum + BigInt(Math.round(((e.durationMins ?? 0) / 60) * (e.billRateCents ?? 0))),
      0n,
    );

    const expenseAgg = await this.db.expense.aggregate({
      where: { tenantId, projectId, deletedAt: null, status: 'APPROVED' },
      _sum: { amountCents: true },
    });
    const expenseCents = expenseAgg._sum.amountCents ?? 0n;
    const actualCents = timeCents + expenseCents;

    return {
      currency: project.currency,
      budgetCents: project.budgetCents !== null ? project.budgetCents.toString() : null,
      timeCents: timeCents.toString(),
      expenseCents: expenseCents.toString(),
      actualCents: actualCents.toString(),
      remainingCents: project.budgetCents !== null ? (project.budgetCents - actualCents).toString() : null,
    };
  }

  // --- Stages ---

  async createStage(tenantId: string, actorId: string, projectId: string, input: CreateStageInput): Promise<Stage> {
    await this.requireProject(tenantId, projectId);
    const stage = await this.db.stage.create({ data: { projectId, ...input } });
    this.audit.writeAudit({ tenantId, userId: actorId, action: 'project.stage_created', entityType: 'stage', entityId: stage.id });
    return stage;
  }

  async updateStage(tenantId: string, actorId: string, projectId: string, stageId: string, input: UpdateStageInput): Promise<Stage> {
    await this.requireStage(tenantId, projectId, stageId);
    const stage = await this.db.stage.update({ where: { id: stageId }, data: input });
    this.audit.writeAudit({ tenantId, userId: actorId, action: 'project.stage_updated', entityType: 'stage', entityId: stageId });
    return stage;
  }

  async deleteStage(tenantId: string, actorId: string, projectId: string, stageId: string): Promise<{ id: string }> {
    await this.requireStage(tenantId, projectId, stageId);
    await this.db.$transaction([
      // Detach tasks so they fall back to "no stage" instead of dangling.
      this.db.task.updateMany({ where: { tenantId, projectId, stageId, deletedAt: null }, data: { stageId: null } }),
      this.db.stage.update({ where: { id: stageId }, data: { deletedAt: new Date() } }),
    ]);
    this.audit.writeAudit({ tenantId, userId: actorId, action: 'project.stage_deleted', entityType: 'stage', entityId: stageId });
    return { id: stageId };
  }

  async reorderStages(tenantId: string, actorId: string, projectId: string, input: ReorderStagesInput): Promise<Stage[]> {
    await this.requireProject(tenantId, projectId);
    const stages = await this.db.stage.findMany({ where: { projectId, deletedAt: null } });
    const known = new Set(stages.map((s) => s.id));
    if (!input.stageIds.every((id) => known.has(id))) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, 'One or more stages do not belong to this project', 422);
    }
    await this.db.$transaction(
      input.stageIds.map((id, index) => this.db.stage.update({ where: { id }, data: { order: index } })),
    );
    this.audit.writeAudit({ tenantId, userId: actorId, action: 'project.stages_reordered', entityType: 'project', entityId: projectId });
    return this.db.stage.findMany({ where: { projectId, deletedAt: null }, orderBy: { order: 'asc' } });
  }

  // --- Members ---

  async addMember(tenantId: string, actorId: string, projectId: string, input: AddProjectMemberInput): Promise<ProjectMember> {
    await this.requireProject(tenantId, projectId);
    const membership = await this.db.membership.findFirst({ where: { tenantId, userId: input.userId, deletedAt: null } });
    if (!membership) throw new AppError(ERROR_CODES.NOT_FOUND, 'User is not a member of this workspace', 404);

    const existing = await this.db.projectMember.findFirst({ where: { projectId, userId: input.userId, deletedAt: null } });
    if (existing) throw new AppError(ERROR_CODES.CONFLICT, 'User is already a project member', 409);

    const member = await this.db.projectMember.create({ data: { projectId, userId: input.userId, role: input.role } });
    this.audit.writeAudit({ tenantId, userId: actorId, action: 'project.member_added', entityType: 'project', entityId: projectId, metadata: { userId: input.userId } });
    return member;
  }

  async removeMember(tenantId: string, actorId: string, projectId: string, userId: string): Promise<{ id: string }> {
    await this.requireProject(tenantId, projectId);
    const member = await this.db.projectMember.findFirst({ where: { projectId, userId, deletedAt: null } });
    if (!member) throw new AppError(ERROR_CODES.NOT_FOUND, 'Project member not found', 404);
    await this.db.projectMember.update({ where: { id: member.id }, data: { deletedAt: new Date() } });
    this.audit.writeAudit({ tenantId, userId: actorId, action: 'project.member_removed', entityType: 'project', entityId: projectId, metadata: { userId } });
    return { id: member.id };
  }

  // --- Internals ---

  private async requireProject(tenantId: string, projectId: string, include?: Prisma.ProjectInclude): Promise<Project> {
    const project = await this.db.project.findFirst({ where: { id: projectId, tenantId, deletedAt: null }, include });
    if (!project) throw new AppError(ERROR_CODES.NOT_FOUND, 'Project not found', 404);
    return project;
  }

  private async requireStage(tenantId: string, projectId: string, stageId: string): Promise<Stage> {
    const stage = await this.db.stage.findFirst({
      where: { id: stageId, projectId, deletedAt: null, project: { tenantId, deletedAt: null } },
    });
    if (!stage) throw new AppError(ERROR_CODES.NOT_FOUND, 'Stage not found', 404);
    return stage;
  }

  private async writeActivity(tenantId: string, actorId: string, projectId: string, action: string, data: Record<string, unknown>): Promise<void> {
    await this.db.activity.create({
      data: { tenantId, actorId, entityType: 'project', entityId: projectId, action, data: data as object },
    });
  }
}
