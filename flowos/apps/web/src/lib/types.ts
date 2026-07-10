/**
 * Frontend view models for FlowOS API resources.
 * Dates arrive as ISO strings; BigInt money fields arrive as strings.
 */
import type { TerminologyMap } from '@flowos/shared';

export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED' | 'CANCELLED';
export type TaskPriority = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';

export interface UserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
}

export interface AuthUser extends UserSummary {
  status: string;
  totpEnabled: boolean;
  preferences: Record<string, unknown>;
  permissions: string[];
}

export interface TenantBranding {
  logoUrl?: string | null;
  faviconUrl?: string | null;
  /** CSS variable overrides keyed by var name without leading --, values are hex colors. */
  theme?: Record<string, string>;
  terminology?: TerminologyMap;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  plan: string;
  enabledModules: Record<string, boolean>;
  branding: TenantBranding;
}

export interface Stage {
  id: string;
  projectId: string;
  name: string;
  key: string;
  color?: string | null;
  order: number;
  isDone: boolean;
}

export interface Project {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  status: ProjectStatus;
  color?: string | null;
  ownerId?: string | null;
  owner?: UserSummary | null;
  startDate?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  budgetCents?: string | null;
  currency: string;
  clientVisible: boolean;
  progress?: number;
  taskCount?: number;
  openTaskCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskAssignee {
  userId: string;
  user: UserSummary;
}

export interface TaskDependency {
  id: string;
  predecessorId: string;
  successorId: string;
  type: string;
  predecessor?: { id: string; title: string };
  successor?: { id: string; title: string };
}

export interface Task {
  id: string;
  projectId: string;
  stageId?: string | null;
  parentId?: string | null;
  title: string;
  description?: string | null;
  priority: TaskPriority;
  order: number;
  startDate?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  estimateMins?: number | null;
  progress: number;
  isMilestone: boolean;
  assignees: TaskAssignee[];
  children?: Task[];
  dependenciesTo?: TaskDependency[];
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  entityType: string;
  entityId: string;
  authorId: string;
  author: UserSummary;
  body: unknown;
  mentions: string[];
  parentId?: string | null;
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  userId: string;
  user?: UserSummary;
  projectId: string;
  taskId?: string | null;
  startedAt: string;
  endedAt?: string | null;
  durationMins?: number | null;
  note?: string | null;
  billable: boolean;
}

export interface AppNotification {
  id: string;
  type: string;
  priority: 'URGENT' | 'NORMAL' | 'LOW';
  title: string;
  body?: string | null;
  link?: { entityType?: string; entityId?: string; url?: string } | null;
  readAt?: string | null;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  isSystem: boolean;
  permissions: string[];
}

export interface Member {
  id: string;
  userId: string;
  user: UserSummary;
  role: Role;
  department?: string | null;
  jobTitle?: string | null;
  weeklyCapacityMins: number;
}

export interface BudgetSummary {
  budgetCents: string | null;
  actualCents: string;
  currency: string;
  loggedMins?: number;
}

export interface Activity {
  id: string;
  actorId?: string | null;
  actor?: UserSummary | null;
  entityType: string;
  entityId: string;
  action: string;
  data: Record<string, unknown>;
  createdAt: string;
}

export interface FileItem {
  id: string;
  name: string;
  mimeType: string;
  tags: string[];
  clientVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationNode {
  id: string;
  type: string;
  config: Record<string, unknown>;
}

export interface AutomationDefinition {
  trigger: { type: string; config: Record<string, unknown> };
  nodes: AutomationNode[];
}

export interface Automation {
  id: string;
  name: string;
  enabled: boolean;
  definition: AutomationDefinition;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}
