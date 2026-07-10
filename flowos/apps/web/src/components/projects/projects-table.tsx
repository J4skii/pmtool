'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format, isBefore } from 'date-fns';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useProjects } from '@/hooks/use-projects';
import { useTerminology } from '@/providers/terminology-provider';
import { cn } from '@/lib/utils';
import type { Project } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ListSkeleton } from '@/components/ui/skeleton';

const PAGE_SIZE = 20;

type SortDir = 'asc' | 'desc';

interface SortState {
  sortBy: string;
  sortDir: SortDir;
}

interface ProjectsTableProps {
  search?: string;
  status?: string;
}

function isOverdue(project: Project): boolean {
  if (!project.dueDate || project.status === 'COMPLETED') return false;
  return isBefore(new Date(project.dueDate), new Date());
}

function SortableHead({
  column,
  label,
  sort,
  onSort,
}: {
  column: string;
  label: string;
  sort: SortState;
  onSort: (column: string) => void;
}) {
  const active = sort.sortBy === column;
  const ariaSort = active ? (sort.sortDir === 'asc' ? 'ascending' : 'descending') : 'none';
  const Icon = active ? (sort.sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <TableHead aria-sort={ariaSort}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          'inline-flex items-center gap-1 rounded-sm font-medium hover:text-foreground',
          active && 'text-foreground',
        )}
      >
        {label}
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </button>
    </TableHead>
  );
}

export function ProjectsTable({ search, status }: ProjectsTableProps) {
  const { t } = useTerminology();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ sortBy: 'name', sortDir: 'asc' });

  const { data, isLoading, isError, refetch } = useProjects({
    page,
    pageSize: PAGE_SIZE,
    search,
    status,
    sortBy: sort.sortBy,
    sortDir: sort.sortDir,
  });

  const handleSort = (column: string) => {
    setPage(1);
    setSort((prev) =>
      prev.sortBy === column
        ? { sortBy: column, sortDir: prev.sortDir === 'asc' ? 'desc' : 'asc' }
        : { sortBy: column, sortDir: 'asc' },
    );
  };

  if (isLoading) return <ListSkeleton rows={8} />;

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border py-12 text-center">
        <p className="text-sm text-muted-foreground">Failed to load {t('projects').toLowerCase()}.</p>
        <Button variant="outline" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-md border py-12 text-center">
        <p className="font-medium">No {t('projects').toLowerCase()} yet</p>
        <p className="text-sm text-muted-foreground">
          Create your first {t('project').toLowerCase()} or adjust your search and filters.
        </p>
      </div>
    );
  }

  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const hasNext = page * PAGE_SIZE < total;

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead column="name" label="Name" sort={sort} onSort={handleSort} />
            <SortableHead column="status" label="Status" sort={sort} onSort={handleSort} />
            <TableHead>Owner</TableHead>
            <SortableHead column="dueDate" label="Due date" sort={sort} onSort={handleSort} />
            <SortableHead column="progress" label="Progress" sort={sort} onSort={handleSort} />
            <TableHead>{t('tasks')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((project) => (
            <TableRow key={project.id}>
              <TableCell>
                <Link href={`/projects/${project.id}`} className="font-medium text-foreground hover:underline">
                  {project.name}
                </Link>
                {project.code ? <div className="text-xs text-muted-foreground">{project.code}</div> : null}
              </TableCell>
              <TableCell>
                <StatusBadge status={project.status} />
              </TableCell>
              <TableCell>
                {project.owner ? (
                  <UserAvatar user={project.owner} size="sm" />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {project.dueDate ? (
                  <span className={cn(isOverdue(project) && 'text-destructive')}>
                    {format(new Date(project.dueDate), 'd MMM yyyy')}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Progress
                    value={project.progress ?? 0}
                    className="w-24"
                    label={`${project.name} progress`}
                  />
                  <span className="text-xs text-muted-foreground">{Math.round(project.progress ?? 0)}%</span>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-muted-foreground">
                  {project.openTaskCount ?? 0} open / {project.taskCount ?? 0}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {from}–{to} of {total}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Prev
          </Button>
          <Button variant="outline" size="sm" disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
