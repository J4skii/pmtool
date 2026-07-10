/**
 * FlowOS permission catalog.
 *
 * Permissions are hierarchical dot-paths. A role's permission list may
 * contain exact keys ("tasks.create"), module wildcards ("tasks.*"),
 * or the global wildcard ("*").
 */

export const PERMISSION_MODULES = [
  'projects',
  'tasks',
  'files',
  'comments',
  'time',
  'finance',
  'team',
  'reports',
  'dashboards',
  'automations',
  'portal',
  'settings',
  'branding',
  'audit',
  'ai',
] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number];

const CRUD = ['read', 'create', 'update', 'delete'] as const;

/** Module → actions. Expanded to full keys by buildPermissionCatalog(). */
const MODULE_ACTIONS: Record<PermissionModule, readonly string[]> = {
  projects: [...CRUD, 'archive', 'duplicate', 'export', 'manage_members', 'manage_stages', 'manage_templates', 'bulk_edit'],
  tasks: [...CRUD, 'assign', 'comment', 'move', 'bulk_edit', 'manage_dependencies', 'complete'],
  files: ['read', 'upload', 'update', 'delete', 'download', 'share', 'manage_versions', 'ocr'],
  comments: [...CRUD, 'mention', 'moderate'],
  time: ['track', 'read', 'read_all', 'update', 'delete', 'approve', 'export'],
  finance: [
    'read', 'budgets.read', 'budgets.update',
    'invoices.read', 'invoices.create', 'invoices.update', 'invoices.send', 'invoices.void',
    'expenses.read', 'expenses.create', 'expenses.approve',
    'pos.read', 'pos.create', 'pos.approve',
    'rates.read', 'rates.update', 'export',
  ],
  team: ['read', 'invite', 'update', 'remove', 'manage_roles', 'manage_capacity', 'view_rates'],
  reports: ['read', 'create', 'update', 'delete', 'schedule', 'export'],
  dashboards: [...CRUD, 'share'],
  automations: [...CRUD, 'execute', 'view_logs', 'manage_webhooks'],
  portal: ['access', 'approve', 'comment', 'upload', 'sign', 'view_invoices', 'pay'],
  settings: ['read', 'update', 'manage_integrations', 'manage_security', 'manage_billing', 'manage_custom_fields'],
  branding: ['read', 'update', 'manage_terminology', 'manage_domain'],
  audit: ['read', 'export'],
  ai: ['chat', 'transcribe', 'analyze_documents', 'generate_content', 'view_usage'],
};

export interface PermissionEntry {
  key: string;
  module: PermissionModule;
  action: string;
}

/** Full flattened catalog (200+ keys) used to render the permissions matrix UI. */
export function buildPermissionCatalog(): PermissionEntry[] {
  return PERMISSION_MODULES.flatMap((module) =>
    MODULE_ACTIONS[module].map((action) => ({ key: `${module}.${action}`, module, action })),
  );
}

export const PERMISSION_CATALOG: readonly PermissionEntry[] = buildPermissionCatalog();

/**
 * Check whether a granted permission list satisfies a required key.
 * Supports "*" and "<module>.*" wildcards.
 */
export function hasPermission(granted: readonly string[], required: string): boolean {
  if (granted.includes('*') || granted.includes(required)) return true;
  const parts = required.split('.');
  // "finance.invoices.read" matches "finance.*" and "finance.invoices.*"
  for (let i = parts.length - 1; i > 0; i--) {
    if (granted.includes(`${parts.slice(0, i).join('.')}.*`)) return true;
  }
  return false;
}
