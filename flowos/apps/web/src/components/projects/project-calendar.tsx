'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { Project } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ViewShell, type ProjectViewProps } from './view-shell';

/** Month grid with projects pinned to their due dates. */
export function ProjectCalendar({ projects, ...shell }: ProjectViewProps & { projects: Project[] }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
      }),
    [month],
  );

  const dated = projects.filter((p): p is Project & { dueDate: string } => Boolean(p.dueDate));

  return (
    <ViewShell {...shell} isEmpty={projects.length === 0} emptyMessage="No projects match your filters.">
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b p-3">
          <h2 className="font-medium">{format(month, 'MMMM yyyy')}</h2>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="Previous month">
              ←
            </Button>
            <Button variant="outline" size="sm" onClick={() => setMonth(startOfMonth(new Date()))}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Next month">
              →
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 border-b text-center text-xs text-muted-foreground">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="py-1.5">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const due = dated.filter((p) => isSameDay(new Date(p.dueDate), day));
            const inMonth = isSameMonth(day, month);
            const isToday = isSameDay(day, new Date());
            return (
              <div
                key={day.toISOString()}
                className={`min-h-20 border-b border-r p-1 text-xs ${inMonth ? '' : 'bg-muted/30 text-muted-foreground'}`}
              >
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${
                    isToday ? 'bg-primary text-primary-foreground' : ''
                  }`}
                >
                  {format(day, 'd')}
                </span>
                <div className="mt-0.5 space-y-0.5">
                  {due.slice(0, 3).map((p) => (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      className="block truncate rounded bg-primary/10 px-1 py-0.5 text-primary hover:bg-primary/20"
                      title={p.name}
                    >
                      {p.name}
                    </Link>
                  ))}
                  {due.length > 3 ? <span className="text-muted-foreground">+{due.length - 3} more</span> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ViewShell>
  );
}
