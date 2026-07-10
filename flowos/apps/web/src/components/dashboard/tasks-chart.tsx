'use client';

import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '@/lib/api-client';
import { useTerminology } from '@/providers/terminology-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface TaskStatusCount {
  status: string;
  count: number;
}

export function TasksChart() {
  const { t } = useTerminology();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard', 'tasks-by-status'],
    queryFn: ({ signal }) => api.get<TaskStatusCount[]>('/dashboard/tasks-by-status', undefined, signal),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('tasks')} by status</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-[280px] w-full" /> : null}

        {isError ? (
          <div className="flex h-[280px] flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">{error?.message ?? 'Failed to load chart data.'}</p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        ) : null}

        {!isLoading && !isError && data ? (
          data.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center">
              <p className="text-sm text-muted-foreground">No {t('tasks').toLowerCase()} to chart yet.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="status"
                  tickLine={false}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    color: 'hsl(var(--foreground))',
                    fontSize: '0.75rem',
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
