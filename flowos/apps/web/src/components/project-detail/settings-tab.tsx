'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { Project, ProjectStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const STATUSES: ProjectStatus[] = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];

export function SettingsTab({ project }: { project: Project }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [status, setStatus] = useState<ProjectStatus>(project.status);

  const update = useMutation({
    mutationFn: () =>
      api.patch<Project>(`/projects/${project.id}`, { name, description: description || undefined, status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      toast.success('Project updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const archive = useMutation({
    mutationFn: () => api.post<Project>(`/projects/${project.id}/archive`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project archived');
      router.push('/projects');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="settings-name">Name</Label>
            <Input id="settings-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-description">Description</Label>
            <Textarea
              id="settings-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="settings-status">Status</Label>
            <Select
              id="settings-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </Select>
          </div>
          <Button onClick={() => update.mutate()} disabled={!name.trim() || update.isPending}>
            {update.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
          <CardDescription>Archiving hides the project from active views. It can be restored later.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="border-destructive text-destructive hover:bg-destructive/10"
            onClick={() => {
              if (window.confirm(`Archive "${project.name}"?`)) archive.mutate();
            }}
            disabled={archive.isPending}
          >
            {archive.isPending ? 'Archiving…' : 'Archive project'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
