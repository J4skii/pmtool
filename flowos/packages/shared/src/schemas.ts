/**
 * Zod schemas shared by API validation pipes and frontend forms.
 * Boundary validation: every mutating endpoint validates against these.
 */
import { z } from 'zod';

// --- Auth ---

export const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
  totpCode: z.string().length(6).regex(/^\d+$/).optional(),
  tenantSlug: z.string().min(1).max(63).optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email().max(320),
  password: z
    .string()
    .min(10)
    .max(128)
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a digit'),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  tenantName: z.string().min(2).max(120),
  tenantSlug: z
    .string()
    .min(2)
    .max(63)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, 'Lowercase letters, digits and hyphens only'),
  industry: z.enum(['construction', 'software', 'marketing', 'healthcare', 'events', 'manufacturing', 'services', 'general']).default('general'),
});
export type RegisterInput = z.infer<typeof registerSchema>;

// --- Projects ---

export const projectStatusSchema = z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED', 'CANCELLED']);

export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().max(30).optional(),
  description: z.string().max(10_000).optional(),
  status: projectStatusSchema.default('PLANNING'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  ownerId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  budgetCents: z.coerce.bigint().nonnegative().optional(),
  currency: z.string().length(3).default('USD'),
  customFields: z.record(z.unknown()).default({}),
  clientVisible: z.boolean().default(false),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema.partial();
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

// --- Tasks ---

export const taskPrioritySchema = z.enum(['URGENT', 'HIGH', 'NORMAL', 'LOW']);
export const dependencyTypeSchema = z.enum(['FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH', 'START_TO_FINISH']);

export const createTaskSchema = z.object({
  projectId: z.string().uuid(),
  stageId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  description: z.string().max(100_000).optional(),
  priority: taskPrioritySchema.default('NORMAL'),
  startDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  estimateMins: z.number().int().positive().max(60 * 24 * 365).optional(),
  assigneeIds: z.array(z.string().uuid()).max(50).default([]),
  customFields: z.record(z.unknown()).default({}),
  isMilestone: z.boolean().default(false),
  recurrenceRule: z.string().max(500).optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = createTaskSchema.partial().omit({ projectId: true });
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const createDependencySchema = z.object({
  predecessorId: z.string().uuid(),
  successorId: z.string().uuid(),
  type: dependencyTypeSchema.default('FINISH_TO_START'),
  lagMins: z.number().int().min(-60 * 24 * 90).max(60 * 24 * 90).default(0),
});
export type CreateDependencyInput = z.infer<typeof createDependencySchema>;

// --- Time tracking ---

export const createTimeEntrySchema = z.object({
  projectId: z.string().uuid(),
  taskId: z.string().uuid().optional(),
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date().optional(),
  durationMins: z.number().int().positive().max(60 * 24).optional(),
  note: z.string().max(2000).optional(),
  billable: z.boolean().default(true),
});
export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>;

// --- Sheet import ---

/** Column index per semantic field within the sheet's header row; -1 = unmapped. */
export const sheetColumnMappingSchema = z.object({
  name: z.number().int(),
  status: z.number().int(),
  owner: z.number().int(),
  priority: z.number().int(),
  start: z.number().int(),
  finish: z.number().int(),
  percent: z.number().int(),
});
export type SheetColumnMapping = z.infer<typeof sheetColumnMappingSchema>;

export const previewSheetSchema = z.object({
  sheetUrl: z.string().min(1).max(2000),
  headerRowIndex: z.number().int().min(0).optional(),
  /** Optional mapping override; omit any field to keep the auto-detected guess for it. */
  mapping: sheetColumnMappingSchema.partial().optional(),
});
export type PreviewSheetInput = z.infer<typeof previewSheetSchema>;

export const importSheetSchema = z.object({
  sheetUrl: z.string().min(1).max(2000),
  projectName: z.string().min(1).max(200),
  headerRowIndex: z.number().int().min(0),
  mapping: sheetColumnMappingSchema,
  /** { "<sheet owner text>": "<FlowOS userId>" } — only include names the user matched. */
  ownerMap: z.record(z.string().uuid()).default({}),
});
export type ImportSheetInput = z.infer<typeof importSheetSchema>;

// --- Pagination (shared list envelope) ---

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  sortBy: z.string().max(50).optional(),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().max(500).optional(),
});
export type PaginationInput = z.infer<typeof paginationSchema>;

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
