import { z } from 'zod';

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(32_000),
});

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(50),
  projectId: z.string().uuid().optional(),
});
export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
