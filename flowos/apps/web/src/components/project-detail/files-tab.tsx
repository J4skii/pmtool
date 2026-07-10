'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { FileItem } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function toFileArray(data: unknown): FileItem[] {
  if (Array.isArray(data)) return data as FileItem[];
  if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: FileItem[] }).items;
  }
  return [];
}

export function FilesTab({ projectId }: { projectId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['files', projectId],
    queryFn: ({ signal }) => api.get<unknown>('/files', { projectId }, signal),
  });
  const files = toFileArray(data);

  if (isLoading) return <Skeleton className="h-64 w-full" aria-busy="true" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => toast.info('Drag-and-drop upload UI is next — presigned upload endpoints are live at /files/presign')}
        >
          Upload file
        </Button>
      </div>
      {files.length === 0 ? (
        <p className="rounded-lg border bg-card py-12 text-center text-sm text-muted-foreground">
          No files yet.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Uploaded</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.name}</TableCell>
                <TableCell className="text-muted-foreground">{f.mimeType}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {f.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{format(new Date(f.createdAt), 'MMM d, yyyy')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
