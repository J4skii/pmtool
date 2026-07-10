/**
 * Custom terminology engine — the heart of white-labeling.
 *
 * Tenants store overrides in Organization.branding.terminology as a
 * key → replacement map. The frontend resolves every UI string through
 * `t()` from the terminology context; the defaults below are the
 * canonical English terms.
 */

export const DEFAULT_TERMINOLOGY = {
  project: 'Project',
  projects: 'Projects',
  task: 'Task',
  tasks: 'Tasks',
  subtask: 'Subtask',
  stage: 'Stage',
  stages: 'Stages',
  milestone: 'Milestone',
  milestones: 'Milestones',
  client: 'Client',
  clients: 'Clients',
  team: 'Team',
  budget: 'Budget',
  invoice: 'Invoice',
  invoices: 'Invoices',
  expense: 'Expense',
  expenses: 'Expenses',
  report: 'Report',
  reports: 'Reports',
  dashboard: 'Dashboard',
  file: 'File',
  files: 'Files',
  workflow: 'Workflow',
  automation: 'Automation',
  timesheet: 'Timesheet',
} as const;

export type TerminologyKey = keyof typeof DEFAULT_TERMINOLOGY;
export type TerminologyMap = Partial<Record<TerminologyKey, string>>;

/** Industry presets applied during onboarding; admin can override any key later. */
export const INDUSTRY_TERMINOLOGY: Record<string, TerminologyMap> = {
  construction: { project: 'Job', projects: 'Jobs', client: 'Owner', clients: 'Owners', milestone: 'Inspection', milestones: 'Inspections' },
  software: { task: 'Ticket', tasks: 'Tickets', stage: 'Column', stages: 'Columns', milestone: 'Release', milestones: 'Releases' },
  healthcare: { client: 'Patient', clients: 'Patients', project: 'Care Plan', projects: 'Care Plans' },
  events: { project: 'Event', projects: 'Events', milestone: 'Checkpoint', milestones: 'Checkpoints' },
  marketing: { project: 'Campaign', projects: 'Campaigns', client: 'Account', clients: 'Accounts' },
  manufacturing: { project: 'Work Order', projects: 'Work Orders', task: 'Operation', tasks: 'Operations' },
  services: { project: 'Engagement', projects: 'Engagements' },
  general: {},
};

/** Resolve a terminology key against tenant overrides, falling back to defaults. */
export function resolveTerm(key: TerminologyKey, overrides?: TerminologyMap): string {
  return overrides?.[key] ?? DEFAULT_TERMINOLOGY[key];
}
