'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { CreateTaskInput } from '@flowos/shared';
import { useCreateTask, useProjectTasks } from '@/hooks/use-tasks';
import type { Task } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserAvatar } from '@/components/ui/avatar';
import { useTerminology } from '@/providers/terminology-provider';

const PRIORITY_VARIANT: Record<Task['priority'], 'destructive' | 'default' | 'secondary' | 'outline'> = {
  URGENT: 'destructive',
  HIGH: 'default',
  NORMAL: 'secondary',
  LOW: 'outline',
};

/** Defensive unwrap: the endpoint may return a bare array or a paginated envelope. */
function toTaskArray(data: unknown): Task[] {
  if (Array.isArray(data)) return data as Task[];
  if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: Task[] }).items;
  }
  return [];
}

export function TasksTab({ projectId }: { projectId: string }) {
  const { t } = useTerminology();
  const { data, isLoading } = useProjectTasks(projectId);
  const createTask = useCreateTask(projectId);
  const [title, setTitle] = useState('');

  const tasks = toTaskArray(data);

  const submit = (): void => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const input: CreateTaskInput = {
      projectId,
      title: trimmed,
      priority: 'NORMAL',
      assigneeIds: [],
      customFields: {},
      isMilestone: false,
    };
    createTask.mutate(input, {
      onSuccess: () => setTitle(''),
      onError: (err) => toast.error(err.message),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`Add a ${t('task').toLowerCase()}…`}
          aria-label={`New ${t('task')} title`}
        />
        <Button type="submit" disabled={!title.trim() || createTask.isPending}>
          Add
        </Button>
      </form>

      {tasks.length === 0 ? (
        <p className="rounded-lg border bg-card py-12 text-center text-sm text-muted-foreground">
          No {t('tasks').toLowerCase()} yet — add the first one above.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assignees</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="text-right">Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="font-medium">
                  {task.isMilestone ? '◆ ' : ''}
                  {task.title}
                </TableCell>
                <TableCell>
                  <Badge variant={PRIORITY_VARIANT[task.priority]}>{task.priority}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex -space-x-1.5">
                    {task.assignees.slice(0, 4).map((a) => (
                      <UserAvatar key={a.userId} user={a.user} size="sm" />
                    ))}
                  </div>
                </TableCell>
                <TableCell>{task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : '—'}</TableCell>
                <TableCell className="text-right">{task.progress}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
