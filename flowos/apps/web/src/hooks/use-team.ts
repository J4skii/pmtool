'use client';

import { useQuery } from '@tanstack/react-query';
import type { Paginated } from '@flowos/shared';
import { api } from '@/lib/api-client';
import type { Member, Role } from '@/lib/types';

export function useMembers(params: { search?: string; page?: number; pageSize?: number } = {}) {
  return useQuery({
    queryKey: ['members', params],
    queryFn: ({ signal }) => api.get<Paginated<Member>>('/users', { ...params }, signal),
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: ({ signal }) => api.get<Role[]>('/roles', undefined, signal),
  });
}
