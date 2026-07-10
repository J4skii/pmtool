'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

interface PortalProject {
  id: string;
  name: string;
  status: string;
  description: string | null;
  startDate: string | null;
  dueDate: string | null;
}

interface PortalProgress {
  percent: number;
}

/**
 * Client portal — a deliberately stripped-down, read-mostly view for
 * external stakeholders. Only clientVisible data is served by the API.
 */
export default function PortalProjectPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;

  const { data: project, isLoading } = useQuery({
    queryKey: ['portal-project', projectId],
    queryFn: () => api.get<PortalProject>(`/projects/${projectId}`),
  });
  const { data: progress } = useQuery({
    queryKey: ['portal-progress', projectId],
    queryFn: () => api.get<PortalProgress>(`/projects/${projectId}/progress`),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-3xl p-6 text-center text-muted-foreground">
        This project is not available. Check your link or contact your project team.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          {project.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
          ) : null}
        </div>
        <Badge>{project.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progress</CardTitle>
          <CardDescription>
            {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'TBC'} —{' '}
            {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'TBC'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={progress?.percent ?? 0} aria-label="Project progress" />
          <p className="text-sm text-muted-foreground">{progress?.percent ?? 0}% complete</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shared files &amp; approvals</CardTitle>
          <CardDescription>
            Documents your project team has shared with you appear here for review and sign-off.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nothing shared yet.</p>
        </CardContent>
      </Card>
    </div>
  );
}
