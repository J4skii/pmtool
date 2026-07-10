'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { differenceInCalendarDays, format } from 'date-fns';
import type { Project } from '@/lib/types';
import { ViewShell, type ProjectViewProps } from './view-shell';

const ROW_HEIGHT = 36;
const LABEL_WIDTH = 200;
const CHART_WIDTH = 720;

/**
 * Lightweight SVG gantt: each project with both start and due date becomes a
 * bar on a shared date scale, with a "today" marker line.
 */
export function ProjectGantt({ projects, ...shell }: ProjectViewProps & { projects: Project[] }) {
  const rows = useMemo(
    () =>
      projects
        .filter((p): p is Project & { startDate: string; dueDate: string } => Boolean(p.startDate && p.dueDate))
        .map((p) => ({ ...p, start: new Date(p.startDate), end: new Date(p.dueDate) }))
        .sort((a, b) => a.start.getTime() - b.start.getTime()),
    [projects],
  );

  const { min, totalDays } = useMemo(() => {
    if (rows.length === 0) return { min: new Date(), totalDays: 1 };
    const minDate = new Date(Math.min(...rows.map((r) => r.start.getTime())));
    const maxDate = new Date(Math.max(...rows.map((r) => r.end.getTime())));
    return { min: minDate, totalDays: Math.max(differenceInCalendarDays(maxDate, minDate), 1) };
  }, [rows]);

  const dayToX = (date: Date): number =>
    LABEL_WIDTH + (differenceInCalendarDays(date, min) / totalDays) * (CHART_WIDTH - LABEL_WIDTH);

  const today = new Date();
  const todayX = dayToX(today);
  const height = rows.length * ROW_HEIGHT + 40;

  return (
    <ViewShell
      {...shell}
      isEmpty={rows.length === 0}
      emptyMessage="No projects with both start and due dates to plot."
    >
      <div className="overflow-x-auto rounded-lg border bg-card p-4">
        <svg
          width={CHART_WIDTH}
          height={height}
          role="img"
          aria-label="Project timeline gantt chart"
          className="min-w-full"
        >
          {/* date scale */}
          <text x={LABEL_WIDTH} y={16} className="fill-muted-foreground text-[10px]">
            {format(min, 'MMM d, yyyy')}
          </text>
          <text x={CHART_WIDTH - 4} y={16} textAnchor="end" className="fill-muted-foreground text-[10px]">
            {format(new Date(min.getTime() + totalDays * 86_400_000), 'MMM d, yyyy')}
          </text>

          {rows.map((row, i) => {
            const y = 30 + i * ROW_HEIGHT;
            const x1 = dayToX(row.start);
            const x2 = dayToX(row.end);
            return (
              <g key={row.id}>
                <text x={0} y={y + 16} className="fill-foreground text-[11px]">
                  {row.name.length > 28 ? `${row.name.slice(0, 27)}…` : row.name}
                </text>
                <rect
                  x={x1}
                  y={y + 4}
                  width={Math.max(x2 - x1, 4)}
                  height={18}
                  rx={4}
                  className={row.status === 'COMPLETED' ? 'fill-green-500/70' : 'fill-primary/70'}
                >
                  <title>
                    {row.name}: {format(row.start, 'MMM d')} → {format(row.end, 'MMM d')}
                  </title>
                </rect>
              </g>
            );
          })}

          {/* today line */}
          {todayX >= LABEL_WIDTH && todayX <= CHART_WIDTH ? (
            <line x1={todayX} y1={22} x2={todayX} y2={height} strokeDasharray="4 3" className="stroke-destructive" />
          ) : null}
        </svg>
        <p className="mt-2 text-xs text-muted-foreground">
          Dashed line marks today.{' '}
          <Link href="/projects" className="underline">
            {rows.length}
          </Link>{' '}
          of {projects.length} projects have dates set.
        </p>
      </div>
    </ViewShell>
  );
}
