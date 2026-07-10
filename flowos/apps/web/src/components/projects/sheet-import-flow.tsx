'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Paginated, SheetColumnMapping } from '@flowos/shared';
import { api } from '@/lib/api-client';
import type { Project } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

interface MemberRow {
  id: string;
  user: { id: string; firstName: string; lastName: string; email: string };
}

interface PreviewRow {
  name: string;
  rawStatus: string;
  owner: string;
  priority: string;
  start: string | null;
  finish: string | null;
  percent: number | null;
}

interface PreviewResponse {
  sheetName: string;
  tabIndex: number;
  tabCount: number;
  headers: string[];
  headerRowIndex: number;
  mapping: SheetColumnMapping;
  rowCount: number;
  previewRows: PreviewRow[];
  distinctOwners: string[];
}

const MAP_FIELDS: Array<[keyof SheetColumnMapping, string]> = [
  ['name', 'Project name*'],
  ['status', 'Status'],
  ['owner', 'Owner'],
  ['priority', 'Priority'],
  ['start', 'Start date'],
  ['finish', 'Finish date'],
  ['percent', '% complete'],
];

interface SheetImportFlowProps {
  onDone: () => void;
  onBack: () => void;
}

export function SheetImportFlow({ onDone, onBack }: SheetImportFlowProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<'input' | 'mapping' | 'owners'>('input');
  const [sheetUrl, setSheetUrl] = useState('');
  const [projectName, setProjectName] = useState('');
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [mapping, setMapping] = useState<SheetColumnMapping | null>(null);
  const [ownerMap, setOwnerMap] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const { data: serviceAccount } = useQuery({
    queryKey: ['sheet-import', 'service-account'],
    queryFn: () => api.get<{ email: string | null }>('/projects/import/sheet/service-account'),
  });

  const { data: members } = useQuery({
    queryKey: ['users', { pageSize: 200 }],
    queryFn: () => api.get<Paginated<MemberRow>>('/users', { pageSize: 200 }),
    enabled: step === 'owners',
  });

  const runPreview = useMutation({
    mutationFn: (overrideMapping?: SheetColumnMapping) =>
      api.post<PreviewResponse>('/projects/import/sheet/preview', {
        sheetUrl,
        mapping: overrideMapping,
      }),
    onSuccess: (data) => {
      setPreview(data);
      setMapping(data.mapping);
      setError(null);
      setStep('mapping');
    },
    onError: (err: Error) => setError(err.message),
  });

  const reMap = useMutation({
    mutationFn: (nextMapping: SheetColumnMapping) =>
      api.post<PreviewResponse>('/projects/import/sheet/preview', { sheetUrl, mapping: nextMapping }),
    onSuccess: (data) => {
      setPreview(data);
      setMapping(data.mapping);
    },
  });

  const doImport = useMutation({
    mutationFn: () =>
      api.post<Project>('/projects/import/sheet', {
        sheetUrl,
        projectName,
        headerRowIndex: preview?.headerRowIndex,
        mapping,
        ownerMap,
      }),
    onSuccess: (project) => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(`Imported "${project.name}" from Google Sheets`);
      onDone();
      router.push(`/projects/${project.id}`);
    },
    onError: (err: Error) => setError(err.message),
  });

  function setMapField(field: keyof SheetColumnMapping, value: string) {
    if (!mapping) return;
    const next = { ...mapping, [field]: Number(value) };
    setMapping(next);
    reMap.mutate(next);
  }

  return (
    <div className="space-y-4">
      {serviceAccount?.email ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">Share the sheet with this email first (Viewer access):</p>
          <p className="mt-1 break-all font-mono text-xs">{serviceAccount.email}</p>
        </div>
      ) : null}

      {step === 'input' ? (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="import-project-name">Project name</Label>
            <Input
              id="import-project-name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Portfolio Summary"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="import-sheet-url">Google Sheet link</Label>
            <Input
              id="import-sheet-url"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
            />
            <p className="text-xs text-muted-foreground">
              Open the tab you want in Google Sheets first, then copy that URL — it'll include the tab's id.
            </p>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button
              type="button"
              disabled={!projectName.trim() || !sheetUrl.trim() || runPreview.isPending}
              onClick={() => runPreview.mutate(undefined)}
            >
              {runPreview.isPending ? 'Reading sheet…' : 'Preview'}
            </Button>
          </div>
        </div>
      ) : null}

      {step === 'mapping' && preview && mapping ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Tab {preview.tabIndex} of {preview.tabCount} — &ldquo;{preview.sheetName}&rdquo; · {preview.rowCount} rows detected
          </p>
          <div className="space-y-2">
            {MAP_FIELDS.map(([field, label]) => (
              <div key={field} className="flex items-center gap-3">
                <span className="w-32 flex-none text-sm font-medium">{label}</span>
                <Select value={String(mapping[field])} onChange={(e) => setMapField(field, e.target.value)}>
                  <option value="-1">— none —</option>
                  {preview.headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `Column ${i + 1}`}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
          </div>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Owner</th>
                  <th className="p-2 text-left">Priority</th>
                </tr>
              </thead>
              <tbody>
                {preview.previewRows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="p-2">{row.name}</td>
                    <td className="p-2">{row.rawStatus}</td>
                    <td className="p-2">{row.owner}</td>
                    <td className="p-2">{row.priority}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => setStep('input')}>
              Back
            </Button>
            <Button
              type="button"
              disabled={mapping.name < 0}
              onClick={() => {
                if (preview.distinctOwners.length > 0) setStep('owners');
                else doImport.mutate();
              }}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      {step === 'owners' && preview ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Match each owner name found in the sheet to a FlowOS teammate, or leave unmatched to keep it as a text label only.
          </p>
          <div className="space-y-2">
            {preview.distinctOwners.map((name) => (
              <div key={name} className="flex items-center gap-3">
                <span className="w-40 flex-none truncate text-sm font-medium">{name}</span>
                <Select
                  value={ownerMap[name] ?? ''}
                  onChange={(e) => setOwnerMap((prev) => ({ ...prev, [name]: e.target.value }))}
                >
                  <option value="">— don&rsquo;t link —</option>
                  {(members?.items ?? []).map((m) => (
                    <option key={m.user.id} value={m.user.id}>
                      {m.user.firstName} {m.user.lastName} ({m.user.email})
                    </option>
                  ))}
                </Select>
              </div>
            ))}
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => setStep('mapping')}>
              Back
            </Button>
            <Button type="button" disabled={doImport.isPending} onClick={() => doImport.mutate()}>
              {doImport.isPending ? 'Creating…' : 'Create project'}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
