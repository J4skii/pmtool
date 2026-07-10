import { paginationSchema, projectStatusSchema } from '@flowos/shared';
import { z } from 'zod';

export const listProjectsQuerySchema = paginationSchema.extend({
  status: projectStatusSchema.optional(),
});
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;

export const createStageSchema = z.object({
  name: z.string().min(1).max(120),
  key: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/, 'Lowercase letters, digits, hyphens and underscores only'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  order: z.number().int().min(0).default(0),
  isDone: z.boolean().default(false),
});
export type CreateStageInput = z.infer<typeof createStageSchema>;

export const updateStageSchema = createStageSchema.partial();
export type UpdateStageInput = z.infer<typeof updateStageSchema>;

export const reorderStagesSchema = z.object({
  /** Stage ids in their new order (index = new `order`). */
  stageIds: z.array(z.string().uuid()).min(1).max(100),
});
export type ReorderStagesInput = z.infer<typeof reorderStagesSchema>;

export const addProjectMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['MANAGER', 'LEAD', 'CONTRIBUTOR', 'VIEWER']).default('CONTRIBUTOR'),
});
export type AddProjectMemberInput = z.infer<typeof addProjectMemberSchema>;
