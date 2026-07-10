'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { UserSummary } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserAvatar } from '@/components/ui/avatar';

interface ProjectMemberRow {
  id: string;
  role: string;
  user: UserSummary;
}

function toMemberArray(data: unknown): ProjectMemberRow[] {
  if (Array.isArray(data)) return data as ProjectMemberRow[];
  if (data && typeof data === 'object') {
    const obj = data as { items?: unknown; members?: unknown };
    if (Array.isArray(obj.items)) return obj.items as ProjectMemberRow[];
    if (Array.isArray(obj.members)) return obj.members as ProjectMemberRow[];
  }
  return [];
}

export function TeamTab({ projectId }: { projectId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: ({ signal }) => api.get<unknown>(`/projects/${projectId}/members`, undefined, signal),
  });
  const members = toMemberArray(data);

  if (isLoading) return <Skeleton className="h-48 w-full" aria-busy="true" />;

  if (members.length === 0) {
    return (
      <p className="rounded-lg border bg-card py-12 text-center text-sm text-muted-foreground">
        No members assigned to this project yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Member</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Project role</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((m) => (
          <TableRow key={m.id}>
            <TableCell>
              <span className="flex items-center gap-2 font-medium">
                <UserAvatar user={m.user} size="sm" />
                {m.user.firstName} {m.user.lastName}
              </span>
            </TableCell>
            <TableCell className="text-muted-foreground">{m.user.email}</TableCell>
            <TableCell>
              <Badge variant="secondary">{m.role}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
