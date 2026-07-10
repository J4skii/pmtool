'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const TRIGGERS = [
  { value: 'task.status_changed', label: 'Status changed' },
  { value: 'task.deadline_approaching', label: 'Deadline approaching' },
  { value: 'file.uploaded', label: 'File uploaded' },
  { value: 'form.submitted', label: 'Form submitted' },
  { value: 'webhook.received', label: 'Webhook received' },
] as const;

const ACTIONS = [
  { value: 'send_email', label: 'Send email' },
  { value: 'create_task', label: 'Create task' },
  { value: 'update_field', label: 'Update field' },
  { value: 'notify', label: 'Send notification' },
  { value: 'call_webhook', label: 'Call webhook' },
] as const;

interface FlowNode {
  id: string;
  type: string;
  config: Record<string, unknown>;
}

interface AutomationRow {
  id: string;
  name: string;
  enabled: boolean;
  definition: { trigger: { type: string; config: Record<string, unknown> }; nodes: FlowNode[] };
}

function BuilderDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState<string>(TRIGGERS[0].value);
  const [nodes, setNodes] = useState<FlowNode[]>([]);

  const save = useMutation({
    mutationFn: () =>
      api.post('/automations', {
        name,
        definition: { trigger: { type: trigger, config: {} }, nodes },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Automation saved');
      onOpenChange(false);
      setName('');
      setNodes([]);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addNode = () =>
    setNodes((prev) => [...prev, { id: crypto.randomUUID(), type: ACTIONS[0].value, config: {} }]);
  const removeNode = (id: string) => setNodes((prev) => prev.filter((n) => n.id !== id));
  const updateNode = (id: string, type: string) =>
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, type } : n)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="New automation">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="automation-name">Name</Label>
          <Input id="automation-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Notify on overdue" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="automation-trigger">When…</Label>
          <Select id="automation-trigger" value={trigger} onChange={(e) => setTrigger(e.target.value)} aria-label="Trigger">
            {TRIGGERS.map((trg) => (
              <option key={trg.value} value={trg.value}>
                {trg.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Then…</Label>
          {nodes.map((node, i) => (
            <div key={node.id} className="flex items-center gap-2">
              <span className="w-6 text-right text-xs text-muted-foreground">{i + 1}.</span>
              <div className="flex-1">
                <Select
                  value={node.type}
                  onChange={(e) => updateNode(node.id, e.target.value)}
                  aria-label={`Action ${i + 1}`}
                >
                  {ACTIONS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </Select>
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeNode(node.id)} aria-label="Remove action">
                ✕
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addNode}>
            + Add action
          </Button>
        </div>
        <Button
          className="w-full"
          disabled={!name || nodes.length === 0 || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? 'Saving…' : 'Save automation'}
        </Button>
      </div>
    </Dialog>
  );
}

export default function AutomationsPage() {
  const [builderOpen, setBuilderOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['automations'],
    queryFn: () => api.get<{ items: AutomationRow[] } | AutomationRow[]>('/automations'),
  });
  const automations: AutomationRow[] = Array.isArray(data) ? data : data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Automations</h1>
          <p className="text-sm text-muted-foreground">When something happens, do something — no code.</p>
        </div>
        <Button onClick={() => setBuilderOpen(true)}>New automation</Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : automations.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            No automations yet. Create your first one to put busywork on autopilot.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {automations.map((a) => (
            <Card key={a.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{a.name}</CardTitle>
                  <CardDescription>
                    {TRIGGERS.find((trg) => trg.value === a.definition.trigger.type)?.label ??
                      a.definition.trigger.type}{' '}
                    → {a.definition.nodes.length} action{a.definition.nodes.length === 1 ? '' : 's'}
                  </CardDescription>
                </div>
                <Badge variant={a.enabled ? 'default' : 'secondary'}>{a.enabled ? 'On' : 'Off'}</Badge>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <BuilderDialog open={builderOpen} onOpenChange={setBuilderOpen} />
    </div>
  );
}
