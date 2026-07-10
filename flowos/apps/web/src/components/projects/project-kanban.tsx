'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import type { Project, ProjectStatus } from '@/lib/types';
import { StatusBadge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ViewShell, type ProjectViewProps } from './view-shell';

const COLUMNS: ProjectStatus[] = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED'];

/**
 * Projects grouped by status. (Task-level drag-and-drop kanban lives inside
 * a project's Tasks tab; at portfolio level a status overview is clearer.)
 */
export function ProjectKanban({ projects, ...shell }: ProjectViewProps & { projects: Project[] }) {
  return (
    <ViewShell {...shell} isEmpty={projects.length === 0} emptyMessage="No projects match your filters.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((status) => {
          const items = projects.filter((p) => p.status === status);
          return (
            <div key={status} className="space-y-3 rounded-lg bg-muted/40 p-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-medium">{status.replace('_', ' ')}</span>
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>
              {items.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`} className="block">
                  <Card className="transition-shadow hover:shadow-md">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm">{p.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between p-4 pt-0 text-xs text-muted-foreground">
                      <StatusBadge status={p.status} />
                      {p.dueDate ? <span>Due {format(new Date(p.dueDate), 'MMM d')}</span> : null}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          );
        })}
      </div>
    </ViewShell>
  );
}
