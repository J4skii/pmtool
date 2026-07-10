'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { AiChatDrawer } from '@/components/layout/ai-chat-drawer';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const hydrated = useAuthStore((state) => state.hydrated);

  useEffect(() => {
    if (hydrated && !accessToken) {
      router.replace('/login');
    }
  }, [hydrated, accessToken, router]);

  if (!hydrated || !accessToken) {
    return (
      <div className="flex h-screen" aria-busy="true" aria-label="Loading application">
        <div className="hidden h-full w-60 shrink-0 border-r bg-card p-4 md:block">
          <Skeleton className="mb-6 h-9 w-full" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-14 items-center gap-2 border-b px-4">
            <Skeleton className="h-9 w-64" />
            <div className="flex-1" />
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <div className="flex-1 space-y-4 overflow-hidden p-6">
            <Skeleton className="h-8 w-56" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      <AiChatDrawer />
    </div>
  );
}
