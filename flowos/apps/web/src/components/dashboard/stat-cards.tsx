'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Clock, FolderKanban, ListTodo, type LucideIcon } from 'lucide-react';
import { api } from '@/lib/api-client';
import { formatMins } from '@/lib/utils';
import { useTerminology } from '@/providers/terminology-provider';
import { Card, CardContent } from '@/components/ui/card';
import { CardGridSkeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export interface DashboardStats {
  activeProjects: number;
  openTasks: number;
  overdueTasks: number;
  minutesThisWeek: number;
}

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  emphasis?: boolean;
}

function StatCard({ label, value, icon: Icon, emphasis = false }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className={`text-2xl font-semibold tracking-tight ${emphasis ? 'text-destructive' : ''}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatCards() {
  const { t } = useTerminology();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: ({ signal }) => api.get<DashboardStats>('/dashboard/stats', undefined, signal),
  });

  if (isLoading) return <CardGridSkeleton cards={4} />;

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
          <p className="text-sm text-muted-foreground">{error?.message ?? 'Failed to load dashboard stats.'}</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label={`Active ${t('projects')}`} value={String(data.activeProjects)} icon={FolderKanban} />
      <StatCard label={`Open ${t('tasks')}`} value={String(data.openTasks)} icon={ListTodo} />
      <StatCard
        label={`Overdue ${t('tasks')}`}
        value={String(data.overdueTasks)}
        icon={AlertTriangle}
        emphasis={data.overdueTasks > 0}
      />
      <StatCard label="Hours this week" value={formatMins(data.minutesThisWeek)} icon={Clock} />
    </div>
  );
}
