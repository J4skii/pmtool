'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export interface ProjectViewProps {
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

/** Shared loading/error/empty chrome for the kanban/gantt/calendar views. */
export function ViewShell({
  isLoading,
  isError,
  onRetry,
  isEmpty,
  emptyMessage,
  children,
}: ProjectViewProps & { isEmpty: boolean; emptyMessage: string; children: ReactNode }) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3" aria-busy="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border bg-card py-16">
        <p className="text-sm text-muted-foreground">Failed to load.</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }
  if (isEmpty) {
    return (
      <div className="rounded-lg border bg-card py-16 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }
  return <>{children}</>;
}
