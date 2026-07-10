import { paginationSchema } from '@flowos/shared';
import { z } from 'zod';

export const startTimerSchema = z.object({
  projectId: z.string().uuid(),
  taskId: z.string().uuid().optional(),
  note: z.string().max(2000).optional(),
  billable: z.boolean().default(true),
});
export type StartTimerInput = z.infer<typeof startTimerSchema>;

export const listEntriesQuerySchema = paginationSchema.extend({
  projectId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  billable: z.coerce.boolean().optional(),
});
export type ListEntriesQuery = z.infer<typeof listEntriesQuerySchema>;
