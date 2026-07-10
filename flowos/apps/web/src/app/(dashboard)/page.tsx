'use client';

import { ErrorBoundary } from '@/components/error-boundary';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { MyTasks } from '@/components/dashboard/my-tasks';
import { StatCards } from '@/components/dashboard/stat-cards';
import { TasksChart } from '@/components/dashboard/tasks-chart';
import { useAuthStore } from '@/stores/auth-store';

export default function DashboardHomePage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back{user ? `, ${user.firstName}` : ''}
        </h1>
        <p className="text-sm text-muted-foreground">Here is what is happening across your work.</p>
      </div>

      <ErrorBoundary>
        <StatCards />
      </ErrorBoundary>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <ErrorBoundary>
            <TasksChart />
          </ErrorBoundary>
          <ErrorBoundary>
            <MyTasks />
          </ErrorBoundary>
        </div>
        <ErrorBoundary>
          <ActivityFeed />
        </ErrorBoundary>
      </div>
    </div>
  );
}
