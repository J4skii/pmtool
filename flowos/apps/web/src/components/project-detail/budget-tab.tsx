'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useProjectBudget } from '@/hooks/use-projects';
import { formatCents } from '@/lib/utils';
import type { Project } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function BudgetTab({ projectId, project }: { projectId: string; project: Project }) {
  const { data: budget, isLoading } = useProjectBudget(projectId);

  if (isLoading || !budget) return <Skeleton className="h-64 w-full" aria-busy="true" />;

  const budgetNum = budget.budgetCents !== null ? Number(budget.budgetCents) / 100 : null;
  const actualNum = Number(budget.actualCents) / 100;
  const remaining = budgetNum !== null ? budgetNum - actualNum : null;
  const over = remaining !== null && remaining < 0;

  const chartData = [
    { name: 'Budget', amount: budgetNum ?? 0 },
    { name: 'Actual', amount: actualNum },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Budget</CardDescription>
            <CardTitle className="text-xl">
              {budget.budgetCents !== null ? formatCents(budget.budgetCents, budget.currency) : 'Not set'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Actual (time + expenses)</CardDescription>
            <CardTitle className="text-xl">{formatCents(budget.actualCents, budget.currency)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{over ? 'Over budget' : 'Remaining'}</CardDescription>
            <CardTitle className={`text-xl ${over ? 'text-destructive' : ''}`}>
              {remaining !== null
                ? formatCents(String(Math.round(Math.abs(remaining) * 100)), budget.currency)
                : '—'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Budget vs actual</CardTitle>
          <CardDescription>{project.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
