'use client';

import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { CircleUser } from 'lucide-react';
import type { Paginated } from '@flowos/shared';
import { api } from '@/lib/api-client';
import type { Activity } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListSkeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

/** "task.created" → "created task"; "UPDATED" → "updated". */
function sentence(activity: Activity): string {
  const action = activity.action.replace(/[_.]/g, ' ').toLowerCase();
  const entity = activity.entityType.replace(/[_.]/g, ' ').toLowerCase();
  return `${action} ${entity}`;
}

function actorName(activity: Activity): string {
  if (!activity.actor) return 'System';
  return `${activity.actor.firstName} ${activity.actor.lastName}`;
}

export function ActivityFeed() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['activity', 'recent'],
    queryFn: ({ signal }) => api.get<Paginated<Activity>>('/activity', { pageSize: 10 }, signal),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? <ListSkeleton rows={6} /> : null}

        {isError ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">{error?.message ?? 'Failed to load activity.'}</p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        ) : null}

        {!isLoading && !isError && data ? (
          data.items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No activity yet. Things will show up here as your team gets to work.
            </p>
          ) : (
            <ul className="space-y-4">
              {data.items.map((activity) => (
                <li key={activity.id} className="flex items-center gap-3">
                  {activity.actor ? (
                    <UserAvatar user={activity.actor} size="sm" />
                  ) : (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                      <CircleUser className="h-4 w-4 text-muted-foreground" aria-hidden />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      <span className="font-medium">{actorName(activity)}</span>{' '}
                      <span className="text-muted-foreground">{sentence(activity)}</span>
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDistanceToNow(parseISO(activity.createdAt), { addSuffix: true })}
                  </span>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
