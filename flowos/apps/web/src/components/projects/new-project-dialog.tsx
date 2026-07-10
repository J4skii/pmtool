'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { Project } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTerminology } from '@/providers/terminology-provider';
import { SheetImportFlow } from './sheet-import-flow';

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Mode = 'choose' | 'blank' | 'import';

export function NewProjectDialog({ open, onOpenChange }: NewProjectDialogProps) {
  const { t } = useTerminology();
  const [mode, setMode] = useState<Mode>('choose');

  function close() {
    onOpenChange(false);
    setMode('choose');
  }

  if (mode === 'choose') {
    return (
      <Dialog open={open} onOpenChange={close} title={`New ${t('project')}`}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode('blank')}
            className="rounded-lg border p-4 text-left transition-colors hover:border-primary hover:bg-accent"
          >
            <p className="font-medium">Blank {t('project')}</p>
            <p className="mt-1 text-sm text-muted-foreground">Start from scratch and fill in details as you go.</p>
          </button>
          <button
            type="button"
            onClick={() => setMode('import')}
            className="rounded-lg border p-4 text-left transition-colors hover:border-primary hover:bg-accent"
          >
            <p className="font-medium">Import from Google Sheet</p>
            <p className="mt-1 text-sm text-muted-foreground">Pull in rows from a spreadsheet as tasks automatically.</p>
          </button>
        </div>
      </Dialog>
    );
  }

  if (mode === 'import') {
    return (
      <Dialog open={open} onOpenChange={close} title={`Import ${t('project')} from Google Sheet`}>
        <SheetImportFlow onDone={close} onBack={() => setMode('choose')} />
      </Dialog>
    );
  }

  return <BlankProjectForm open={open} onOpenChange={close} onBack={() => setMode('choose')} t={t} />;
}

function BlankProjectForm({
  open,
  onOpenChange,
  onBack,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBack: () => void;
  t: (key: string) => string;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      api.post<Project>('/projects', {
        name,
        description: description || undefined,
        dueDate: dueDate || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(`${t('project')} created`);
      onOpenChange(false);
      setName('');
      setDescription('');
      setDueDate('');
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={`New ${t('project')}`}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) {
            setError('Name is required');
            return;
          }
          create.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="project-name">Name</Label>
          <Input
            id="project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`e.g. Website redesign`}
            aria-invalid={Boolean(error)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="project-description">Description</Label>
          <Textarea
            id="project-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="project-due">Due date</Label>
          <Input id="project-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Creating…' : `Create ${t('project')}`}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
