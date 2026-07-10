'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useTerminology } from '@/providers/terminology-provider';
import { useProject, useProjectBudget, useProjectSheetImport, useResyncSheet } from '@/hooks/use-projects';
import { ApiError } from '@/lib/api-client';
import { formatCents } from '@/lib/utils';
import type { Project } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { OverviewTab } from '@/components/project-detail/overview-tab';
import { TasksTab } from '@/components/project-detail/tasks-tab';
import { FilesTab } from '@/components/project-detail/files-tab';
import { TeamTab } from '@/components/project-detail/team-tab';
import { BudgetTab } from '@/components/project-detail/budget-tab';
import { SettingsTab } from '@/components/project-detail/settings-tab';

function BudgetBar({ projectId }: { projectId: string }) {
  const { data: budget } = useProjectBudget(projectId);
  if (!budget) return <Skeleton className="h-8 w-full max-w-sm" />;
  if (budget.budgetCents === null) {
    return <p className="text-sm text-muted-foreground">No budget set</p>;
  }
  const budgetNum = Number(budget.budgetCents);
  const actualNum = Number(budget.actualCents);
  const percent = budgetNum > 0 ? (actualNum / budgetNum) * 100 : 0;
  const over = percent > 100;
  return (
    <div className="max-w-sm space-y-1">
      <p className="text-sm text-muted-foreground">
        Spent{' '}
        <span className={over ? 'font-medium text-destructive' : 'font-medium text-foreground'}>
          {formatCents(budget.actualCents, budget.currency)}
        </span>{' '}
        of {formatCents(budget.budgetCents, budget.currency)}
      </p>
      <Progress
        value={percent}
        label="Budget spent"
        indicatorClassName={over ? 'bg-destructive' : undefined}
      />
    </div>
  );
}

function SheetSyncControl({ projectId }: { projectId: string }) {
  const { data: info } = useProjectSheetImport(projectId);
  const resync = useResyncSheet(projectId);

  if (!info?.linked) return null;

  return (
    <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2 text-sm">
      <span className="text-muted-foreground">
        Imported from Google Sheets
        {info.lastSyncedAt ? ` · last synced ${format(new Date(info.lastSyncedAt), 'MMM d, HH:mm')}` : ''}
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={resync.isPending}
        onClick={() =>
          resync.mutate(undefined, {
            onSuccess: (result) => toast.success(`Synced: ${result.created} new, ${result.updated} updated`),
            onError: (err) => toast.error(err instanceof Error ? err.message : 'Sync failed'),
          })
        }
      >
        {resync.isPending ? 'Syncing…' : 'Re-sync from sheet'}
      </Button>
    </div>
  );
}

function ProjectHeader({ project }: { project: Project }) {
  return (
    <Card>
      <CardHeader>
        <Link
          href="/projects"
          className="mb-1 inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to projects
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle className="text-2xl">{project.name}</CardTitle>
          {project.code ? (
            <span className="text-sm font-medium text-muted-foreground">{project.code}</span>
          ) : null}
          <StatusBadge status={project.status} />
        </div>
        <SheetSyncControl projectId={project.id} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {project.owner ? (
            <span className="inline-flex items-center gap-2">
              <UserAvatar user={project.owner} size="sm" />
              {project.owner.firstName} {project.owner.lastName}
            </span>
          ) : null}
          {project.startDate ? <span>Starts {format(new Date(project.startDate), 'MMM d, yyyy')}</span> : null}
          {project.dueDate ? <span>Due {format(new Date(project.dueDate), 'MMM d, yyyy')}</span> : null}
        </div>
        <div className="max-w-sm space-y-1">
          <p className="text-sm text-muted-foreground">Progress {Math.round(project.progress ?? 0)}%</p>
          <Progress value={project.progress ?? 0} label="Project progress" />
        </div>
        <BudgetBar projectId={project.id} />
      </CardContent>
    </Card>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading project">
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-9 w-96" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const { t } = useTerminology();
  const { data: project, isLoading, error, refetch } = useProject(params.id);

  if (isLoading) return <PageSkeleton />;

  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border bg-card py-16 text-center">
        <p className="text-lg font-semibold">Project not found</p>
        <p className="text-sm text-muted-foreground">
          It may have been deleted, or you may not have access to it.
        </p>
        <Button variant="outline" size="sm">
          <Link href="/projects">Back to projects</Link>
        </Button>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border bg-card py-16 text-center">
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'Failed to load project.'}
        </p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProjectHeader project={project} />
      <Tabs defaultValue="overview">
        <TabsList label="Project sections">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">{t('tasks')}</TabsTrigger>
          <TabsTrigger value="files">{t('files')}</TabsTrigger>
          <TabsTrigger value="team">{t('team')}</TabsTrigger>
          <TabsTrigger value="budget">{t('budget')}</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <OverviewTab project={project} />
        </TabsContent>
        <TabsContent value="tasks">
          <TasksTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="files">
          <FilesTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="team">
          <TeamTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="budget">
          <BudgetTab projectId={project.id} project={project} />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab project={project} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
