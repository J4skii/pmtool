'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjects } from '@/hooks/use-projects';
import { useTerminology } from '@/providers/terminology-provider';

interface ProjectRow {
  id: string;
  name: string;
  status: string;
  budgetCents: string | null;
}

const TEMPLATES = [
  { key: 'status', name: 'Status breakdown', description: 'Distribution by status' },
  { key: 'budget', name: 'Budget comparison', description: 'Budget per item, side by side' },
] as const;

type TemplateKey = (typeof TEMPLATES)[number]['key'];
type ChartKind = 'bar' | 'pie';

const CHART_COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];

export default function ReportsPage() {
  const { t } = useTerminology();
  const [template, setTemplate] = useState<TemplateKey>('status');
  const [chart, setChart] = useState<ChartKind>('bar');
  const { data, isLoading } = useProjects({ page: 1, pageSize: 200 });
  const projects = (data?.items ?? []) as unknown as ProjectRow[];

  const rows = useMemo(() => {
    if (template === 'status') {
      const counts = new Map<string, number>();
      for (const p of projects) counts.set(p.status, (counts.get(p.status) ?? 0) + 1);
      return [...counts.entries()].map(([name, value]) => ({ name, value }));
    }
    return projects
      .filter((p) => p.budgetCents !== null)
      .map((p) => ({ name: p.name, value: Number(p.budgetCents) / 100 }))
      .slice(0, 20);
  }, [projects, template]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('reports')}</h1>
        <p className="text-sm text-muted-foreground">
          Build a quick report from your {t('projects').toLowerCase()} data.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {TEMPLATES.map((tpl) => (
          <button
            key={tpl.key}
            type="button"
            onClick={() => setTemplate(tpl.key)}
            aria-pressed={template === tpl.key}
            className={`rounded-lg border p-4 text-left transition-colors hover:bg-accent ${
              template === tpl.key ? 'border-primary ring-1 ring-primary' : ''
            }`}
          >
            <div className="font-medium">{tpl.name}</div>
            <div className="text-sm text-muted-foreground">{tpl.description}</div>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{TEMPLATES.find((x) => x.key === template)?.name}</CardTitle>
            <CardDescription>
              {rows.length} data point{rows.length === 1 ? '' : 's'}
            </CardDescription>
          </div>
          <div className="w-32">
            <Select value={chart} onChange={(e) => setChart(e.target.value as ChartKind)} aria-label="Chart type">
              <option value="bar">Bar</option>
              <option value="pie">Pie</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-80 w-full" />
          ) : rows.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">No data to report on yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              {chart === 'bar' ? (
                <BarChart data={rows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <PieChart>
                  <Pie data={rows} dataKey="value" nameKey="name" label>
                    {rows.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              )}
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
