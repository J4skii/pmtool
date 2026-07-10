'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Comment } from '@/lib/types';

export function useComments(entityType: string, entityId: string | undefined) {
  return useQuery({
    queryKey: ['comments', entityType, entityId],
    queryFn: ({ signal }) => api.get<Comment[]>('/comments', { entityType, entityId }, signal),
    enabled: Boolean(entityId),
  });
}

export interface CreateCommentInput {
  entityType: string;
  entityId: string;
  body: unknown;
  mentions?: string[];
  parentId?: string;
}

export function useCreateComment(entityType: string, entityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCommentInput) => api.post<Comment>('/comments', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', entityType, entityId] });
    },
  });
}
