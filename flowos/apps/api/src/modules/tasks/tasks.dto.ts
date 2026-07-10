import { paginationSchema, taskPrioritySchema } from '@flowos/shared';
import { z } from 'zod';

export const listTasksQuerySchema = paginationSchema.extend({
  stageId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  priority: taskPrioritySchema.optional(),
});
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;

export const moveTaskSchema = z.object({
  /** Target stage; null moves the task out of every stage. */
  stageId: z.string().uuid().nullable(),
  /** Fractional board order within the target stage. */
  order: z.number().finite(),
});
export type MoveTaskInput = z.infer<typeof moveTaskSchema>;

export const assignTaskSchema = z.object({
  userId: z.string().uuid(),
});
export type AssignTaskInput = z.infer<typeof assignTaskSchema>;

/** Fields that may be applied to many tasks at once. */
export const bulkTaskChangesSchema = z.object({
  stageId: z.string().uuid().nullable().optional(),
  priority: taskPrioritySchema.optional(),
  startDate: z.coerce.date().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  estimateMins: z.number().int().positive().nullable().optional(),
  clientVisible: z.boolean().optional(),
});

export const bulkUpdateTasksSchema = z.object({
  taskIds: z.array(z.string().uuid()).min(1).max(200),
  changes: bulkTaskChangesSchema,
});
export type BulkUpdateTasksInput = z.infer<typeof bulkUpdateTasksSchema>;
