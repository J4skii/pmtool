import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  ERROR_CODES,
  type CreateDependencyInput,
  type CreateTaskInput,
  type Paginated,
  type UpdateTaskInput,
} from '@flowos/shared';
import type { Prisma, Task, TaskDependency } from '@flowos/database';
import { PRISMA, type Db } from '../../common/prisma.provider';
import { AuditService } from '../../common/services/audit.service';
import { RealtimeService } from '../realtime/realtime.service';
import type { BulkUpdateTasksInput, ListTasksQuery, MoveTaskInput } from './tasks.dto';

export interface CriticalPathNode {
  taskId: string;
  title: string;
  estimateMins: number;
  /** Earliest start offset from project start, in minutes. */
  earliestStartMins: number;
}

export interface CriticalPathResult {
  totalDurationMins: number;
  path: CriticalPathNode[];
}

type TaskRow = Prisma.TaskGetPayload<{
  include: {
    assignees: { include: { user: { select: { id: true; firstName: true; lastName: true; avatarUrl: true } } } };
    stage: true;
  };
}>;

const TASK_INCLUDE = {
  assignees: { include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } } },
  stage: true,
} satisfies Prisma.TaskInclude;

@Injectable()
export class TasksService {
  constructor(
    @Inject(PRISMA) private readonly db: Db,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
  ) {}

  async listByProject(tenantId: string, projectId: string, query: ListTasksQuery): Promise<Paginated<TaskRow>> {
    const where: Prisma.TaskWhereInput = {
      tenantId,
      projectId,
      deletedAt: null,
      ...(query.stageId ? { stageId: query.stageId } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.assigneeId ? { assignees: { some: { userId: query.assigneeId } } } : {}),
      ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const [items, total] = await this.db.$transaction([
      this.db.task.findMany({
        where,
        include: TASK_INCLUDE,
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.db.task.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async getById(tenantId: string, taskId: string): Promise<TaskRow> {
    const task = await this.db.task.findFirst({
      where: { id: taskId, tenantId, deletedAt: null },
      include: {
        ...TASK_INCLUDE,
        children: { where: { deletedAt: null }, orderBy: { order: 'asc' } },
        dependenciesTo: { include: { predecessor: { select: { id: true, title: true } } } },
        dependenciesFrom: { include: { successor: { select: { id: true, title: true } } } },
      },
    });
    if (!task) throw new AppError(ERROR_CODES.NOT_FOUND, 'Task not found', 404);
    return task;
  }

  async create(tenantId: string, actorId: string, input: CreateTaskInput): Promise<TaskRow> {
    const project = await this.db.project.findFirst({
      where: { id: input.projectId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!project) throw new AppError(ERROR_CODES.NOT_FOUND, 'Project not found', 404);

    const { assigneeIds, ...rest } = input;
    const task = await this.db.task.create({
      data: {
        ...rest,
        tenantId,
        customFields: rest.customFields as Prisma.InputJsonValue,
        assignees: { create: assigneeIds.map((userId) => ({ userId })) },
      },
      include: TASK_INCLUDE,
    });

    await this.recordActivity(tenantId, actorId, task.id, 'task.created', { title: task.title });
    this.realtime.emitToProject(task.projectId, 'task.created', { taskId: task.id });
    return task;
  }

  async update(tenantId: string, actorId: string, taskId: string, input: UpdateTaskInput): Promise<TaskRow> {
    await this.requireTask(tenantId, taskId);
    const { assigneeIds, customFields, ...rest } = input;

    // Assignees are replaced in a separate step: mixing relation writes with
    // scalar FK fields (stageId/parentId) is rejected by Prisma's checked
    // update input, so both operations run in one transaction instead.
    const task = await this.db.$transaction(async (tx) => {
      if (assigneeIds !== undefined) {
        await tx.taskAssignee.deleteMany({ where: { taskId } });
        if (assigneeIds.length > 0) {
          await tx.taskAssignee.createMany({ data: assigneeIds.map((userId) => ({ taskId, userId })) });
        }
      }
      return tx.task.update({
        where: { id: taskId },
        data: {
          ...rest,
          ...(customFields !== undefined ? { customFields: customFields as Prisma.InputJsonValue } : {}),
        },
        include: TASK_INCLUDE,
      });
    });

    await this.recordActivity(tenantId, actorId, taskId, 'task.updated', { fields: Object.keys(input) });
    this.realtime.emitToProject(task.projectId, 'task.updated', { taskId });
    return task;
  }

  async move(tenantId: string, actorId: string, taskId: string, input: MoveTaskInput): Promise<TaskRow> {
    const existing = await this.requireTask(tenantId, taskId);

    if (input.stageId) {
      const stage = await this.db.stage.findFirst({
        where: { id: input.stageId, projectId: existing.projectId, deletedAt: null },
        select: { id: true, isDone: true },
      });
      if (!stage) throw new AppError(ERROR_CODES.NOT_FOUND, 'Stage not found in this project', 404);
    }

    const task = await this.db.task.update({
      where: { id: taskId },
      data: { stageId: input.stageId, order: input.order },
      include: TASK_INCLUDE,
    });

    await this.recordActivity(tenantId, actorId, taskId, 'task.status_changed', {
      from: existing.stageId,
      to: input.stageId,
    });
    this.realtime.emitToProject(task.projectId, 'task.updated', { taskId, stageId: input.stageId });
    return task;
  }

  async bulkUpdate(tenantId: string, actorId: string, input: BulkUpdateTasksInput): Promise<{ updated: number }> {
    // Verify every task belongs to this tenant before touching any of them.
    const count = await this.db.task.count({
      where: { id: { in: input.taskIds }, tenantId, deletedAt: null },
    });
    if (count !== input.taskIds.length) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'One or more tasks were not found', 404);
    }

    const result = await this.db.task.updateMany({
      where: { id: { in: input.taskIds }, tenantId },
      data: input.changes,
    });

    await this.recordActivity(tenantId, actorId, input.taskIds[0] ?? '', 'task.bulk_updated', {
      taskIds: input.taskIds,
      changes: Object.keys(input.changes),
    });
    return { updated: result.count };
  }

  async softDelete(tenantId: string, actorId: string, taskId: string): Promise<{ id: string }> {
    const task = await this.requireTask(tenantId, taskId);
    await this.db.task.update({ where: { id: taskId }, data: { deletedAt: new Date() } });
    await this.recordActivity(tenantId, actorId, taskId, 'task.deleted', { title: task.title });
    this.realtime.emitToProject(task.projectId, 'task.updated', { taskId, deleted: true });
    return { id: taskId };
  }

  // ----------------------------------------------------------------
  // Dependencies
  // ----------------------------------------------------------------

  async addDependency(tenantId: string, input: CreateDependencyInput): Promise<TaskDependency> {
    if (input.predecessorId === input.successorId) {
      throw new AppError(ERROR_CODES.TASK_CIRCULAR_DEPENDENCY, 'A task cannot depend on itself', 409);
    }

    const [predecessor, successor] = await Promise.all([
      this.requireTask(tenantId, input.predecessorId),
      this.requireTask(tenantId, input.successorId),
    ]);
    if (predecessor.projectId !== successor.projectId) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, 'Dependencies must stay within one project', 422);
    }

    // Circular check: adding predecessor -> successor creates a cycle iff
    // predecessor is already reachable FROM successor by following existing
    // successor edges. DFS over the project's dependency graph.
    const edges = await this.db.taskDependency.findMany({
      where: { predecessor: { projectId: predecessor.projectId, deletedAt: null } },
      select: { predecessorId: true, successorId: true },
    });
    if (this.isReachable(edges, input.successorId, input.predecessorId)) {
      throw new AppError(
        ERROR_CODES.TASK_CIRCULAR_DEPENDENCY,
        'This dependency would create a cycle',
        409,
      );
    }

    return this.db.taskDependency.create({ data: input });
  }

  async removeDependency(tenantId: string, dependencyId: string): Promise<{ id: string }> {
    const dep = await this.db.taskDependency.findFirst({
      where: { id: dependencyId, predecessor: { tenantId } },
    });
    if (!dep) throw new AppError(ERROR_CODES.NOT_FOUND, 'Dependency not found', 404);
    await this.db.taskDependency.delete({ where: { id: dependencyId } });
    return { id: dependencyId };
  }

  /** DFS reachability: can we reach `target` starting from `start`? */
  isReachable(
    edges: Array<{ predecessorId: string; successorId: string }>,
    start: string,
    target: string,
  ): boolean {
    const adjacency = new Map<string, string[]>();
    for (const e of edges) {
      const next = adjacency.get(e.predecessorId) ?? [];
      next.push(e.successorId);
      adjacency.set(e.predecessorId, next);
    }
    const stack = [start];
    const seen = new Set<string>();
    while (stack.length > 0) {
      const node = stack.pop() as string;
      if (node === target) return true;
      if (seen.has(node)) continue;
      seen.add(node);
      for (const next of adjacency.get(node) ?? []) stack.push(next);
    }
    return false;
  }

  // ----------------------------------------------------------------
  // Critical path
  // ----------------------------------------------------------------

  /**
   * Critical path via longest path in the dependency DAG.
   *
   * 1. Topologically sort tasks (Kahn's algorithm) over dependency edges.
   * 2. Relax edges in topological order: each task's earliest start is the
   *    max over predecessors of (predecessor earliest start + predecessor
   *    duration + edge lag). Durations come from estimateMins (default 0).
   * 3. The critical path ends at the task with the largest finish time;
   *    walk the recorded `via` pointers back to the start.
   *
   * Only FINISH_TO_START semantics are applied to the timeline (other
   * dependency types still constrain ordering but are treated as FS for
   * duration purposes — documented simplification).
   */
  async criticalPath(tenantId: string, projectId: string): Promise<CriticalPathResult> {
    const tasks = await this.db.task.findMany({
      where: { tenantId, projectId, deletedAt: null },
      select: { id: true, title: true, estimateMins: true },
    });
    const edges = await this.db.taskDependency.findMany({
      where: { predecessor: { projectId, deletedAt: null }, successor: { deletedAt: null } },
      select: { predecessorId: true, successorId: true, lagMins: true },
    });

    const duration = new Map(tasks.map((t) => [t.id, t.estimateMins ?? 0]));
    const titles = new Map(tasks.map((t) => [t.id, t.title]));

    // Kahn's algorithm.
    const indegree = new Map<string, number>(tasks.map((t) => [t.id, 0]));
    const out = new Map<string, Array<{ to: string; lag: number }>>();
    for (const e of edges) {
      if (!indegree.has(e.predecessorId) || !indegree.has(e.successorId)) continue;
      indegree.set(e.successorId, (indegree.get(e.successorId) ?? 0) + 1);
      const list = out.get(e.predecessorId) ?? [];
      list.push({ to: e.successorId, lag: e.lagMins });
      out.set(e.predecessorId, list);
    }

    const queue = tasks.filter((t) => (indegree.get(t.id) ?? 0) === 0).map((t) => t.id);
    const topo: string[] = [];
    while (queue.length > 0) {
      const id = queue.shift() as string;
      topo.push(id);
      for (const edge of out.get(id) ?? []) {
        const remaining = (indegree.get(edge.to) ?? 0) - 1;
        indegree.set(edge.to, remaining);
        if (remaining === 0) queue.push(edge.to);
      }
    }

    // Longest-path relaxation.
    const earliestStart = new Map<string, number>(topo.map((id) => [id, 0]));
    const via = new Map<string, string>();
    for (const id of topo) {
      const finish = (earliestStart.get(id) ?? 0) + (duration.get(id) ?? 0);
      for (const edge of out.get(id) ?? []) {
        const candidate = finish + edge.lag;
        if (candidate > (earliestStart.get(edge.to) ?? 0)) {
          earliestStart.set(edge.to, candidate);
          via.set(edge.to, id);
        }
      }
    }

    // Find the sink with the maximum finish time and walk back.
    let endId: string | null = null;
    let total = 0;
    for (const id of topo) {
      const finish = (earliestStart.get(id) ?? 0) + (duration.get(id) ?? 0);
      if (finish >= total) {
        total = finish;
        endId = id;
      }
    }

    const path: CriticalPathNode[] = [];
    let cursor = endId;
    while (cursor) {
      path.unshift({
        taskId: cursor,
        title: titles.get(cursor) ?? '',
        estimateMins: duration.get(cursor) ?? 0,
        earliestStartMins: earliestStart.get(cursor) ?? 0,
      });
      cursor = via.get(cursor) ?? null;
    }

    return { totalDurationMins: total, path };
  }

  // ----------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------

  private async requireTask(tenantId: string, taskId: string): Promise<Task> {
    const task = await this.db.task.findFirst({ where: { id: taskId, tenantId, deletedAt: null } });
    if (!task) throw new AppError(ERROR_CODES.NOT_FOUND, 'Task not found', 404);
    return task;
  }

  private async recordActivity(
    tenantId: string,
    actorId: string,
    taskId: string,
    action: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    await this.db.activity.create({
      data: { tenantId, actorId, entityType: 'task', entityId: taskId, action, data: data as Prisma.InputJsonValue },
    });
    this.audit.writeAudit({ tenantId, userId: actorId, action, entityType: 'task', entityId: taskId });
  }
}
