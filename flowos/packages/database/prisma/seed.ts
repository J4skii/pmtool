/**
 * FlowOS demo seed — 2 tenants, 5 users, 10 projects, 50 tasks.
 * Idempotent: wipes and recreates the demo tenants only.
 *
 * Run: pnpm db:seed
 */
import { PrismaClient, ProjectStatus, TaskPriority, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SYSTEM_ROLES: Array<{ name: string; permissions: string[] }> = [
  { name: 'Super Admin', permissions: ['*'] },
  { name: 'Admin', permissions: ['projects.*', 'tasks.*', 'files.*', 'finance.*', 'team.*', 'reports.*', 'automations.*', 'settings.*'] },
  { name: 'Project Manager', permissions: ['projects.*', 'tasks.*', 'files.*', 'reports.read', 'finance.read', 'team.read'] },
  { name: 'Team Lead', permissions: ['projects.read', 'tasks.*', 'files.*', 'reports.read'] },
  { name: 'Contributor', permissions: ['projects.read', 'tasks.read', 'tasks.update', 'tasks.comment', 'files.read', 'files.upload', 'time.track'] },
  { name: 'Viewer', permissions: ['projects.read', 'tasks.read', 'files.read'] },
  { name: 'Client', permissions: ['portal.*'] },
];

const STAGE_SETS: Record<string, string[]> = {
  construction: ['Pre-Construction', 'Permits', 'Foundation', 'Framing', 'Finishing', 'Handover'],
  software: ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'],
  marketing: ['Brief', 'Concept', 'Production', 'Approval', 'Launched'],
  general: ['Not Started', 'In Progress', 'Blocked', 'Complete'],
};

async function wipeTenant(slug: string): Promise<void> {
  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    await prisma.tenant.delete({ where: { id: existing.id } });
  }
}

async function seedTenant(opts: {
  slug: string;
  name: string;
  industry: string;
  users: Array<{ email: string; firstName: string; lastName: string; role: string }>;
  projects: Array<{ name: string; code: string; stages: string[]; status: ProjectStatus; budgetCents: bigint }>;
}): Promise<void> {
  const tenant = await prisma.tenant.create({
    data: {
      slug: opts.slug,
      name: opts.name,
      enabledModules: { projects: true, tasks: true, files: true, finance: true, reports: true, automations: true, portal: true, ai: true },
      organization: {
        create: {
          legalName: opts.name,
          industry: opts.industry,
          branding: {
            terminology: opts.industry === 'construction' ? { project: 'Job', task: 'Work Item', client: 'Owner' } : {},
            theme: { primary: opts.industry === 'construction' ? '#ea580c' : '#2563eb' },
          },
        },
      },
    },
  });

  const roles = new Map<string, string>();
  for (const r of SYSTEM_ROLES) {
    const role = await prisma.role.create({
      data: { tenantId: tenant.id, name: r.name, isSystem: true, permissions: r.permissions },
    });
    roles.set(r.name, role.id);
  }

  const passwordHash = await bcrypt.hash('Demo1234!', 12);
  const userIds: string[] = [];
  for (const u of opts.users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        passwordHash,
        status: UserStatus.ACTIVE,
      },
    });
    userIds.push(user.id);
    const roleId = roles.get(u.role);
    if (!roleId) throw new Error(`Unknown role ${u.role}`);
    await prisma.membership.create({
      data: { tenantId: tenant.id, userId: user.id, roleId },
    });
  }

  const priorities = [TaskPriority.URGENT, TaskPriority.HIGH, TaskPriority.NORMAL, TaskPriority.LOW];
  let taskCounter = 0;

  for (const p of opts.projects) {
    const project = await prisma.project.create({
      data: {
        tenantId: tenant.id,
        name: p.name,
        code: p.code,
        status: p.status,
        ownerId: userIds[0],
        budgetCents: p.budgetCents,
        startDate: new Date('2026-06-01'),
        dueDate: new Date('2026-12-15'),
        members: {
          create: userIds.map((uid, i) => ({
            userId: uid,
            role: i === 0 ? 'MANAGER' : 'CONTRIBUTOR',
          })),
        },
        stages: {
          create: p.stages.map((name, i) => ({
            name,
            key: name.toLowerCase().replace(/\s+/g, '_'),
            order: i,
            isDone: i === p.stages.length - 1,
          })),
        },
      },
      include: { stages: true },
    });

    // 5 tasks per project => 50 tasks across 10 projects
    for (let i = 0; i < 5; i++) {
      taskCounter++;
      const stage = project.stages[i % project.stages.length];
      await prisma.task.create({
        data: {
          tenantId: tenant.id,
          projectId: project.id,
          stageId: stage?.id,
          title: `${p.name} — task ${i + 1}`,
          priority: priorities[taskCounter % priorities.length] ?? TaskPriority.NORMAL,
          order: i,
          dueDate: new Date(Date.UTC(2026, 6 + (i % 5), 10 + i)),
          estimateMins: 60 * (i + 1),
          assignees: { create: [{ userId: userIds[i % userIds.length] ?? userIds[0]! }] },
        },
      });
    }
  }
}

async function main(): Promise<void> {
  await wipeTenant('acme-build');
  await wipeTenant('nova-digital');

  await seedTenant({
    slug: 'acme-build',
    name: 'Acme Construction Co',
    industry: 'construction',
    users: [
      { email: 'owner@acmebuild.demo', firstName: 'Alice', lastName: 'Mason', role: 'Super Admin' },
      { email: 'pm@acmebuild.demo', firstName: 'Ben', lastName: 'Carter', role: 'Project Manager' },
      { email: 'field@acmebuild.demo', firstName: 'Carlos', lastName: 'Diaz', role: 'Contributor' },
    ],
    projects: [
      { name: 'Riverside Apartments', code: 'JOB-001', stages: STAGE_SETS.construction!, status: 'ACTIVE', budgetCents: 250_000_000n },
      { name: 'Oakwood Office Fit-out', code: 'JOB-002', stages: STAGE_SETS.construction!, status: 'ACTIVE', budgetCents: 80_000_000n },
      { name: 'Harbor Bridge Repair', code: 'JOB-003', stages: STAGE_SETS.construction!, status: 'PLANNING', budgetCents: 500_000_000n },
      { name: 'Mall Renovation Phase 2', code: 'JOB-004', stages: STAGE_SETS.general!, status: 'ON_HOLD', budgetCents: 120_000_000n },
      { name: 'Warehouse Expansion', code: 'JOB-005', stages: STAGE_SETS.construction!, status: 'COMPLETED', budgetCents: 60_000_000n },
    ],
  });

  await seedTenant({
    slug: 'nova-digital',
    name: 'Nova Digital Agency',
    industry: 'marketing',
    users: [
      { email: 'ceo@novadigital.demo', firstName: 'Dana', lastName: 'Evans', role: 'Super Admin' },
      { email: 'lead@novadigital.demo', firstName: 'Eli', lastName: 'Ford', role: 'Team Lead' },
    ],
    projects: [
      { name: 'Spring Product Launch', code: 'CMP-001', stages: STAGE_SETS.marketing!, status: 'ACTIVE', budgetCents: 5_000_000n },
      { name: 'Website Redesign', code: 'CMP-002', stages: STAGE_SETS.software!, status: 'ACTIVE', budgetCents: 12_000_000n },
      { name: 'SEO Retainer — Q3', code: 'CMP-003', stages: STAGE_SETS.general!, status: 'ACTIVE', budgetCents: 3_000_000n },
      { name: 'Brand Refresh', code: 'CMP-004', stages: STAGE_SETS.marketing!, status: 'PLANNING', budgetCents: 8_000_000n },
      { name: 'Holiday Email Campaign', code: 'CMP-005', stages: STAGE_SETS.marketing!, status: 'COMPLETED', budgetCents: 2_000_000n },
    ],
  });

  // eslint-disable-next-line no-console
  console.log('Seed complete: 2 tenants, 5 users, 10 projects, 50 tasks. Login password for all demo users: Demo1234!');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
