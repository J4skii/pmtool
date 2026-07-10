import { z } from 'zod';

const ENTITY_TYPES = ['task', 'project', 'file', 'invoice', 'expense'] as const;

export const listCommentsQuerySchema = z.object({
  entityType: z.enum(ENTITY_TYPES),
  entityId: z.string().uuid(),
});
export type ListCommentsQuery = z.infer<typeof listCommentsQuerySchema>;

export const createCommentSchema = z.object({
  entityType: z.enum(ENTITY_TYPES),
  entityId: z.string().uuid(),
  /** TipTap document JSON. */
  body: z.record(z.unknown()),
  mentions: z.array(z.string().uuid()).max(50).default([]),
  parentId: z.string().uuid().optional(),
  /** Proofing pin: { x, y, page?, shape? } */
  annotation: z.record(z.unknown()).optional(),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const updateCommentSchema = z.object({
  body: z.record(z.unknown()),
  mentions: z.array(z.string().uuid()).max(50).optional(),
});
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
