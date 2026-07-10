'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateTaskInput, UpdateTaskInput } from '@flowos/shared';
import { api } from '@/lib/api-client';
import type { Task } from '@/lib/types';

export function useProjectTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tasks', projectId],
    queryFn: ({ signal }) => api.get<Task[]>(`/projects/${projectId}/tasks`, undefined, signal),
    enabled: Boolean(projectId),
  });
}

export function useTask(taskId: string | undefined) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: ({ signal }) => api.get<Task>(`/tasks/${taskId}`, undefined, signal),
    enabled: Boolean(taskId),
  });
}

export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => api.post<Task>('/tasks', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });
}

export function useUpdateTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: UpdateTaskInput & { progress?: number } }) =>
      api.patch<Task>(`/tasks/${taskId}`, input),
    onSuccess: (task) => {
      queryClient.setQueryData(['task', task.id], task);
      void queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });
}

export function useDeleteTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => api.delete<void>(`/tasks/${taskId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });
}

export interface MoveTaskInput {
  taskId: string;
  stageId: string;
  order: number;
}

/** Optimistically moves a task between stages on the kanban board. */
export function useMoveTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, stageId, order }: MoveTaskInput) =>
      api.post<Task>(`/tasks/${taskId}/move`, { stageId, order }),
    onMutate: async ({ taskId, stageId, order }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', projectId] });
      const previous = queryClient.getQueryData<Task[]>(['tasks', projectId]);
      if (previous) {
        queryClient.setQueryData<Task[]>(
          ['tasks', projectId],
          previous.map((task) => (task.id === taskId ? { ...task, stageId, order } : task)),
        );
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['tasks', projectId], context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });
}
