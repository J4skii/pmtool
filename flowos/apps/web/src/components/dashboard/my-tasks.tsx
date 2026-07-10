'use client';

import { useQuery } from '@tanstack/react-query';
import { format, isPast, parseISO } from 'date-fns';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { Task } from '@/lib/types';
import { useTerminology } from '@/providers/terminology-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListSkeleton } from '@/components/ui/skeleton';
import { PriorityBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

function isOverdue(task: Task): boolean {
  return Boolean(task.dueDate) && !task.completedAt && isPast(parseISO(task.dueDate as string));
}

export function MyTasks() {
  const { t } = useTerminology();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['tasks', 'my'],
    queryFn: ({ signal }) => api.get<Task[]>('/tasks/my', undefined, signal),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>My {t('tasks')}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? <ListSkeleton rows={5} /> : null}

        {isError ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">{error?.message ?? `Failed to load your ${t('tasks').toLowerCase()}.`}</p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        ) : null}

        {!isLoading && !isError && data ? (
          data.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No open {t('tasks').toLowerCase()} assigned to you. Nice work!
            </p>
          ) : (
            <ul className="divide-y">
              {data.map((task) => {
                const overdue = isOverdue(task);
                return (
                  <li key={task.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{task.title}</p>
                      {task.dueDate ? (
                        <p className={cn('text-xs', overdue ? 'text-destructive' : 'text-muted-foreground')}>
                          Due {format(parseISO(task.dueDate), 'MMM d, yyyy')}
                          {overdue ? ' — overdue' : ''}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">No due date</p>
                      )}
                    </div>
                    <PriorityBadge priority={task.priority} />
                  </li>
                );
              })}
            </ul>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
