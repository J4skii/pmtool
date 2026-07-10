import { z } from 'zod';

export const inviteUserSchema = z.object({
  email: z.string().email().max(320),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  roleId: z.string().uuid(),
  department: z.string().max(120).optional(),
  jobTitle: z.string().max(120).optional(),
});
export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export const updateMembershipSchema = z.object({
  roleId: z.string().uuid().optional(),
  costRateCents: z.number().int().nonnegative().nullable().optional(),
  billRateCents: z.number().int().nonnegative().nullable().optional(),
  weeklyCapacityMins: z.number().int().min(0).max(10_080).optional(),
  department: z.string().max(120).nullable().optional(),
  jobTitle: z.string().max(120).nullable().optional(),
  managerId: z.string().uuid().nullable().optional(),
});
export type UpdateMembershipInput = z.infer<typeof updateMembershipSchema>;
