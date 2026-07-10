import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z.string().min(1).max(80),
  permissions: z.array(z.string().min(1).max(100)).max(500).default([]),
});
export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = createRoleSchema.partial();
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
