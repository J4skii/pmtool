'use client';

import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { api } from '@/lib/api-client';
import { initials } from '@/lib/utils';
import type { Activity, Project } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function formatDate(value?: string | null): string {
  return value ? format(new Date(value), 'MMM d, yyyy') : '—';
}

function ActivityCard({ project }: { project: Project }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['activity', 'project', project.id],
    queryFn: ({ signal }) =>
      api.get<{ items: Activity[] }>(
        '/activity',
        { entityType: 'project', entityId: project.id, pageSize: 10 },
        signal,
      ),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading activity">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'Failed to load activity.'}
            </p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        ) : !data || data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ul className="space-y-3">
            {data.items.map((activity) => (
              <li key={activity.id} className="flex items-center gap-3 text-sm">
                <Avatar
                  size="sm"
                  src={activity.actor?.avatarUrl}
                  fallback={initials(activity.actor?.firstName, activity.actor?.lastName)}
                  alt={
                    activity.actor
                      ? `${activity.actor.firstName} ${activity.actor.lastName}`
                      : 'System'
                  }
                />
                <span className="min-w-0 flex-1 truncate">
                  {activity.actor ? (
                    <span className="font-medium">
                      {activity.actor.firstName} {activity.actor.lastName}{' '}
                    </span>
                  ) : null}
                  <span className="text-muted-foreground">
                    {activity.action} {activity.entityType}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function OverviewTab({ project }: { project: Project }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          {project.description ? (
            <p className="whitespace-pre-wrap text-sm">{project.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No description</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <DetailRow label="Status" value={project.status.replace('_', ' ')} />
          <DetailRow label="Start date" value={formatDate(project.startDate)} />
          <DetailRow label="Due date" value={formatDate(project.dueDate)} />
          <DetailRow
            label="Owner"
            value={project.owner ? `${project.owner.firstName} ${project.owner.lastName}` : '—'}
          />
          <DetailRow label="Currency" value={project.currency} />
          <DetailRow label="Client visible" value={project.clientVisible ? 'Yes' : 'No'} />
          <DetailRow label="Created" value={formatDate(project.createdAt)} />
          <DetailRow label="Updated" value={formatDate(project.updatedAt)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <DetailRow label="Total tasks" value={String(project.taskCount ?? 0)} />
          <DetailRow label="Open tasks" value={String(project.openTaskCount ?? 0)} />
          <DetailRow label="Progress" value={`${Math.round(project.progress ?? 0)}%`} />
        </CardContent>
      </Card>

      <ActivityCard project={project} />
    </div>
  );
}
