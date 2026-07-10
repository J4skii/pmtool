'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateTimeEntryInput, Paginated } from '@flowos/shared';
import { api } from '@/lib/api-client';
import type { TimeEntry } from '@/lib/types';

/** The currently running timer entry (endedAt == null), if any. */
export function useRunningTimer() {
  return useQuery({
    queryKey: ['timer', 'running'],
    queryFn: ({ signal }) => api.get<TimeEntry | null>('/time/timer', undefined, signal),
    refetchInterval: 60_000,
  });
}

export function useStartTimer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { projectId: string; taskId?: string; note?: string }) =>
      api.post<TimeEntry>('/time/timer/start', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['timer'] });
    },
  });
}

export function useStopTimer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<TimeEntry>('/time/timer/stop'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['timer'] });
      void queryClient.invalidateQueries({ queryKey: ['time-entries'] });
    },
  });
}

export function useTimeEntries(params: { projectId?: string; taskId?: string; page?: number; pageSize?: number } = {}) {
  return useQuery({
    queryKey: ['time-entries', params],
    queryFn: ({ signal }) => api.get<Paginated<TimeEntry>>('/time/entries', { ...params }, signal),
  });
}

export function useCreateTimeEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTimeEntryInput) => api.post<TimeEntry>('/time/entries', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['time-entries'] });
    },
  });
}

/** Elapsed seconds ticker for a running timer. */
export function useElapsedSeconds(startedAt: string | undefined): number {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startedAt) {
      setElapsed(0);
      return;
    }
    const compute = () => Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    setElapsed(compute());
    const interval = window.setInterval(() => setElapsed(compute()), 1000);
    return () => window.clearInterval(interval);
  }, [startedAt]);
  return elapsed;
}
