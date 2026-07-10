import { AppError } from '@flowos/shared';
import type { Db } from '../../common/prisma.provider';
import type { AuditService } from '../../common/services/audit.service';
import type { RealtimeService } from '../realtime/realtime.service';
import { TasksService } from './tasks.service';

/**
 * Unit tests for the dependency-graph logic. Prisma, audit and realtime
 * are mocked — these tests exercise pure graph behavior.
 */
describe('TasksService graph logic', () => {
  const audit = { writeAudit: jest.fn() } as unknown as AuditService;
  const realtime = { emitToProject: jest.fn(), emitToTenant: jest.fn(), emitToUser: jest.fn() } as unknown as RealtimeService;

  function makeService(db: Partial<Record<string, unknown>>): TasksService {
    return new TasksService(db as unknown as Db, audit, realtime);
  }

  describe('isReachable', () => {
    const service = makeService({});
    const edges = [
      { predecessorId: 'a', successorId: 'b' },
      { predecessorId: 'b', successorId: 'c' },
      { predecessorId: 'c', successorId: 'd' },
    ];

    it('finds transitive reachability', () => {
      expect(service.isReachable(edges, 'a', 'd')).toBe(true);
    });

    it('does not find reverse reachability', () => {
      expect(service.isReachable(edges, 'd', 'a')).toBe(false);
    });

    it('handles disconnected nodes', () => {
      expect(service.isReachable(edges, 'a', 'zzz')).toBe(false);
    });
  });

  describe('addDependency circular detection', () => {
    const task = (id: string): { id: string; projectId: string } => ({ id, projectId: 'p1' });

    it('rejects a self-dependency', async () => {
      const service = makeService({});
      await expect(
        service.addDependency('t1', { predecessorId: 'a', successorId: 'a', type: 'FINISH_TO_START', lagMins: 0 }),
      ).rejects.toMatchObject({ code: 'TASK_CIRCULAR_DEPENDENCY' });
    });

    it('rejects an edge that closes a cycle', async () => {
      const db = {
        task: {
          findFirst: jest.fn(({ where }: { where: { id: string } }) => Promise.resolve(task(where.id))),
        },
        taskDependency: {
          // existing chain: a -> b -> c ; adding c -> a must fail
          findMany: jest.fn().mockResolvedValue([
            { predecessorId: 'a', successorId: 'b' },
            { predecessorId: 'b', successorId: 'c' },
          ]),
          create: jest.fn(),
        },
      };
      const service = makeService(db);
      await expect(
        service.addDependency('t1', { predecessorId: 'c', successorId: 'a', type: 'FINISH_TO_START', lagMins: 0 }),
      ).rejects.toBeInstanceOf(AppError);
      expect(db.taskDependency.create).not.toHaveBeenCalled();
    });

    it('accepts an acyclic edge', async () => {
      const db = {
        task: {
          findFirst: jest.fn(({ where }: { where: { id: string } }) => Promise.resolve(task(where.id))),
        },
        taskDependency: {
          findMany: jest.fn().mockResolvedValue([{ predecessorId: 'a', successorId: 'b' }]),
          create: jest.fn().mockResolvedValue({ id: 'dep1' }),
        },
      };
      const service = makeService(db);
      await expect(
        service.addDependency('t1', { predecessorId: 'b', successorId: 'c', type: 'FINISH_TO_START', lagMins: 0 }),
      ).resolves.toEqual({ id: 'dep1' });
    });
  });

  describe('criticalPath', () => {
    it('computes the longest path through the DAG', async () => {
      // a(60) -> b(120) -> d(30) ; a(60) -> c(10) -> d(30)
      // Critical: a -> b -> d = 210 minutes.
      const db = {
        task: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'a', title: 'A', estimateMins: 60 },
            { id: 'b', title: 'B', estimateMins: 120 },
            { id: 'c', title: 'C', estimateMins: 10 },
            { id: 'd', title: 'D', estimateMins: 30 },
          ]),
        },
        taskDependency: {
          findMany: jest.fn().mockResolvedValue([
            { predecessorId: 'a', successorId: 'b', lagMins: 0 },
            { predecessorId: 'a', successorId: 'c', lagMins: 0 },
            { predecessorId: 'b', successorId: 'd', lagMins: 0 },
            { predecessorId: 'c', successorId: 'd', lagMins: 0 },
          ]),
        },
      };
      const service = makeService(db);
      const result = await service.criticalPath('t1', 'p1');

      expect(result.totalDurationMins).toBe(210);
      expect(result.path.map((n) => n.taskId)).toEqual(['a', 'b', 'd']);
      expect(result.path[2]?.earliestStartMins).toBe(180);
    });

    it('respects positive lag on edges', async () => {
      const db = {
        task: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'a', title: 'A', estimateMins: 60 },
            { id: 'b', title: 'B', estimateMins: 60 },
          ]),
        },
        taskDependency: {
          findMany: jest.fn().mockResolvedValue([{ predecessorId: 'a', successorId: 'b', lagMins: 30 }]),
        },
      };
      const service = makeService(db);
      const result = await service.criticalPath('t1', 'p1');
      expect(result.totalDurationMins).toBe(150);
    });
  });
});
