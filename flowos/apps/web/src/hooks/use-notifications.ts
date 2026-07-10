'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Paginated } from '@flowos/shared';
import { api } from '@/lib/api-client';
import type { AppNotification } from '@/lib/types';

export function useNotifications(enabled = true) {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: ({ signal }) => api.get<Paginated<AppNotification>>('/notifications', { pageSize: 20 }, signal),
    enabled,
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<AppNotification>(`/notifications/${id}`, { read: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
