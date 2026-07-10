'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useMarkNotificationRead, useNotifications } from '@/hooks/use-notifications';
import type { AppNotification } from '@/lib/types';
import { Popover } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data, isLoading, isError, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();
  const [markingAll, setMarkingAll] = useState(false);

  const items = data?.items ?? [];
  const unread = items.filter((item) => item.readAt == null);
  const unreadCount = unread.length;

  const onMarkAllRead = async () => {
    if (unread.length === 0) return;
    setMarkingAll(true);
    try {
      await Promise.all(unread.map((item) => markRead.mutateAsync(item.id)));
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all notifications as read');
    } finally {
      setMarkingAll(false);
    }
  };

  const onItemClick = (item: AppNotification) => {
    if (item.readAt == null) {
      markRead.mutate(item.id);
    }
    if (item.link?.url) {
      setOpen(false);
      router.push(item.link.url);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      triggerLabel="Notifications"
      align="end"
      className="w-96 max-w-[calc(100vw-2rem)] p-0"
      triggerClassName="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
      trigger={
        <>
          <Bell className="h-4 w-4" aria-hidden />
          {unreadCount > 0 ? (
            <span
              aria-hidden
              className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null}
        </>
      }
    >
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-semibold">Notifications</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void onMarkAllRead()}
          loading={markingAll}
          disabled={unreadCount === 0}
        >
          Mark all read
        </Button>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2 p-3" aria-busy="true" aria-label="Loading notifications">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : isError ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            <p>Failed to load notifications.</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">You&apos;re all caught up</p>
        ) : (
          <ul>
            {items.map((item) => {
              const isUnread = item.readAt == null;
              return (
                <li key={item.id} className="border-b last:border-b-0">
                  <button
                    type="button"
                    onClick={() => onItemClick(item)}
                    className={cn(
                      'flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground',
                      isUnread && 'bg-muted/50',
                    )}
                  >
                    <span
                      className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', isUnread ? 'bg-primary' : 'bg-transparent')}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className={cn('block truncate text-sm', isUnread ? 'font-semibold' : 'font-medium')}>
                        {item.title}
                        {isUnread ? <span className="sr-only"> (unread)</span> : null}
                      </span>
                      {item.body ? (
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.body}</span>
                      ) : null}
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Popover>
  );
}
