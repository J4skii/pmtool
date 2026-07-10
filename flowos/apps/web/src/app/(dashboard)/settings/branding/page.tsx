'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_TERMINOLOGY, type TerminologyKey, type TerminologyMap } from '@flowos/shared';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTerminology } from '@/providers/terminology-provider';

/**
 * White-label editor: colors update the live CSS variables immediately for
 * preview; Save persists the skin to Organization.branding via the API.
 */
export default function BrandingSettingsPage() {
  const { overrides } = useTerminology();
  const [primary, setPrimary] = useState('#2563eb');
  const [terms, setTerms] = useState<TerminologyMap>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTerms(overrides);
  }, [overrides]);

  // Live preview: write the primary color into the runtime CSS variable.
  useEffect(() => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(primary.slice(i, i + 2), 16));
    if ([r, g, b].some((v) => Number.isNaN(v))) return;
    document.documentElement.style.setProperty('--brand-primary', primary);
  }, [primary]);

  const save = async (): Promise<void> => {
    setSaving(true);
    try {
      await api.patch('/tenants/current/branding', {
        theme: { primary },
        terminology: Object.fromEntries(Object.entries(terms).filter(([, v]) => v && v.length > 0)),
      });
      toast.success('Branding saved — reload to apply everywhere');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save branding');
    } finally {
      setSaving(false);
    }
  };

  const keys = Object.keys(DEFAULT_TERMINOLOGY) as TerminologyKey[];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Brand colors</CardTitle>
          <CardDescription>Changes preview live in this session.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-end gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="primary-color">Primary color</Label>
            <div className="flex items-center gap-2">
              <input
                id="primary-color"
                type="color"
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border bg-transparent"
                aria-label="Primary color picker"
              />
              <Input value={primary} onChange={(e) => setPrimary(e.target.value)} className="w-28 font-mono" />
            </div>
          </div>
          <div className="h-9 flex-1 rounded-md" style={{ backgroundColor: primary }} aria-hidden />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logo &amp; assets</CardTitle>
          <CardDescription>Logo, favicon and login background.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => toast.info('Asset upload arrives with the files UI — presigned upload endpoints are live')}>
            Upload logo
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Terminology</CardTitle>
          <CardDescription>
            Rename any system word for your whole workspace — e.g. Projects → Jobs, Clients → Patients.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Default term</TableHead>
                <TableHead>Your term</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key) => (
                <TableRow key={key}>
                  <TableCell className="font-medium">{DEFAULT_TERMINOLOGY[key]}</TableCell>
                  <TableCell>
                    <Input
                      value={terms[key] ?? ''}
                      placeholder={DEFAULT_TERMINOLOGY[key]}
                      onChange={(e) => setTerms((prev) => ({ ...prev, [key]: e.target.value }))}
                      aria-label={`Override for ${DEFAULT_TERMINOLOGY[key]}`}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Button onClick={() => void save()} disabled={saving}>
        {saving ? 'Saving…' : 'Save branding'}
      </Button>
    </div>
  );
}
