'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTerminology } from '@/providers/terminology-provider';
import { useDebounce } from '@/hooks/use-debounce';
import { useProjects } from '@/hooks/use-projects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectsTable } from '@/components/projects/projects-table';
import { NewProjectDialog } from '@/components/projects/new-project-dialog';
import { ProjectKanban } from '@/components/projects/project-kanban';
import { ProjectGantt } from '@/components/projects/project-gantt';
import { ProjectCalendar } from '@/components/projects/project-calendar';
import type { ProjectStatus } from '@/lib/types';

const STATUSES: ProjectStatus[] = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED', 'CANCELLED'];

function statusLabel(status: ProjectStatus): string {
  return status.replace('_', ' ');
}

export default function ProjectsPage() {
  const { t } = useTerminology();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  // Wide query shared by the kanban, gantt and calendar views.
  const wide = useProjects({
    search: debouncedSearch || undefined,
    status: status || undefined,
    pageSize: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t('projects')}</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden />
          New {t('project')}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={`Search ${t('projects').toLowerCase()}…`}
          aria-label={`Search ${t('projects')}`}
          className="max-w-xs"
        />
        <div className="w-44">
          <Select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Tabs defaultValue="table">
        <TabsList label="Project views">
          <TabsTrigger value="table">Table</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="gantt">Gantt</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          <ProjectsTable search={debouncedSearch || undefined} status={status || undefined} />
        </TabsContent>

        <TabsContent value="kanban">
          <ProjectKanban
            projects={wide.data?.items ?? []}
            isLoading={wide.isLoading}
            isError={wide.isError}
            onRetry={() => void wide.refetch()}
          />
        </TabsContent>

        <TabsContent value="gantt">
          <ProjectGantt
            projects={wide.data?.items ?? []}
            isLoading={wide.isLoading}
            isError={wide.isError}
            onRetry={() => void wide.refetch()}
          />
        </TabsContent>

        <TabsContent value="calendar">
          <ProjectCalendar
            projects={wide.data?.items ?? []}
            isLoading={wide.isLoading}
            isError={wide.isError}
            onRetry={() => void wide.refetch()}
          />
        </TabsContent>
      </Tabs>

      <NewProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
