/**
 * System roles seeded into every new tenant at registration.
 * Permission keys reference the catalog in @flowos/shared and support
 * wildcard grants ("*" and "<module>.*").
 */
export interface SystemRoleSeed {
  name: string;
  permissions: string[];
}

export const SYSTEM_ROLES: readonly SystemRoleSeed[] = [
  { name: 'Super Admin', permissions: ['*'] },
  {
    name: 'Admin',
    permissions: [
      'projects.*', 'tasks.*', 'files.*', 'comments.*', 'time.*', 'finance.*', 'team.*',
      'reports.*', 'dashboards.*', 'automations.*', 'settings.*', 'branding.*', 'audit.*', 'ai.*',
    ],
  },
  {
    name: 'Project Manager',
    permissions: [
      'projects.*', 'tasks.*', 'files.*', 'comments.*', 'time.*', 'reports.*', 'dashboards.*',
      'team.read', 'finance.budgets.read', 'finance.expenses.read', 'finance.expenses.create',
      'ai.chat', 'ai.transcribe',
    ],
  },
  {
    name: 'Team Lead',
    permissions: [
      'projects.read', 'projects.update', 'tasks.*', 'files.*', 'comments.*',
      'time.track', 'time.read', 'time.read_all', 'time.approve',
      'dashboards.read', 'reports.read', 'team.read', 'ai.chat',
    ],
  },
  {
    name: 'Contributor',
    permissions: [
      'projects.read', 'tasks.read', 'tasks.create', 'tasks.update', 'tasks.comment',
      'tasks.move', 'tasks.complete', 'files.read', 'files.upload', 'files.download',
      'comments.*', 'time.track', 'time.read', 'dashboards.read', 'ai.chat',
    ],
  },
  {
    name: 'Viewer',
    permissions: [
      'projects.read', 'tasks.read', 'files.read', 'files.download',
      'comments.read', 'dashboards.read', 'reports.read',
    ],
  },
  { name: 'Client', permissions: ['portal.*'] },
];

export const SUPER_ADMIN_ROLE_NAME = 'Super Admin';
