import { z } from 'zod';

export const presignUploadSchema = z.object({
  name: z.string().min(1).max(255),
  mimeType: z.string().min(3).max(255),
  sizeBytes: z.number().int().positive(),
  projectId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  folderId: z.string().uuid().optional(),
});
export type PresignUploadInput = z.infer<typeof presignUploadSchema>;

export const confirmUploadSchema = presignUploadSchema.extend({
  storageKey: z.string().min(1).max(1024),
  checksum: z.string().max(128).optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
  expiresAt: z.coerce.date().optional(),
  clientVisible: z.boolean().default(false),
});
export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;

export const createFolderSchema = z.object({
  name: z.string().min(1).max(255),
  projectId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
});
export type CreateFolderInput = z.infer<typeof createFolderSchema>;

export const listFilesQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  folderId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
});
export type ListFilesQuery = z.infer<typeof listFilesQuerySchema>;
