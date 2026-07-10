'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateProjectInput, Paginated, UpdateProjectInput } from '@flowos/shared';
import { api } from '@/lib/api-client';
import type { BudgetSummary, Project, Stage } from '@/lib/types';

export interface ProjectListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export function useProjects(params: ProjectListParams = {}) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: ({ signal }) => api.get<Paginated<Project>>('/projects', { ...params }, signal),
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: ({ signal }) => api.get<Project>(`/projects/${id}`, undefined, signal),
    enabled: Boolean(id),
  });
}

export function useProjectStages(projectId: string | undefined) {
  return useQuery({
    queryKey: ['stages', projectId],
    queryFn: ({ signal }) => api.get<Stage[]>(`/projects/${projectId}/stages`, undefined, signal),
    enabled: Boolean(projectId),
  });
}

export function useProjectBudget(projectId: string | undefined) {
  return useQuery({
    queryKey: ['budget', projectId],
    queryFn: ({ signal }) => api.get<BudgetSummary>(`/projects/${projectId}/budget`, undefined, signal),
    enabled: Boolean(projectId),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => api.post<Project>('/projects', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProjectInput) => api.patch<Project>(`/projects/${id}`, input),
    onSuccess: (project) => {
      queryClient.setQueryData(['project', id], project);
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export interface SheetImportInfo {
  linked: boolean;
  lastSyncedAt: string | null;
  lastRowCount: number | null;
}

export function useProjectSheetImport(projectId: string | undefined) {
  return useQuery({
    queryKey: ['sheet-import', projectId],
    queryFn: ({ signal }) => api.get<SheetImportInfo>(`/projects/${projectId}/sheet-import`, undefined, signal),
    enabled: Boolean(projectId),
  });
}

export function useResyncSheet(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ created: number; updated: number }>(`/projects/${projectId}/resync-sheet`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sheet-import', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useUpdateStages(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stages: Array<Pick<Stage, 'id' | 'name' | 'order' | 'isDone'> & { color?: string | null }>) =>
      api.put<Stage[]>(`/projects/${projectId}/stages`, { stages }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['stages', projectId] });
    },
  });
}
