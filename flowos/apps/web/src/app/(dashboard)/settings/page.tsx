'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useAuthStore } from '@/stores/auth-store';

export default function ProfileSettingsPage() {
  const user = useAuthStore((s) => s.user);
  const { theme, setTheme } = useTheme();
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [saving, setSaving] = useState(false);

  const save = async (): Promise<void> => {
    setSaving(true);
    try {
      await api.patch('/auth/me', { firstName, lastName });
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your personal details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email ?? ''} disabled aria-readonly />
          </div>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Theme preference for this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="theme-select">Theme</Label>
            <Select id="theme-select" value={theme ?? 'system'} onChange={(e) => setTheme(e.target.value)} aria-label="Theme">
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Two-factor authentication</CardTitle>
          <CardDescription>Protect your account with an authenticator app (TOTP).</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => toast.info('2FA setup flow coming soon — API endpoints are live at /auth/2fa/setup')}>
            Set up 2FA
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
