'use client';

import { useMemo, useState } from 'react';
import { PERMISSION_CATALOG, type PermissionEntry } from '@flowos/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InviteDialog } from '@/components/team/invite-dialog';
import { useDebounce } from '@/hooks/use-debounce';
import { useMembers, useRoles } from '@/hooks/use-team';
import { useTerminology } from '@/providers/terminology-provider';

interface MemberRow {
  id: string;
  department: string | null;
  jobTitle: string | null;
  weeklyCapacityMins: number;
  role: { id: string; name: string };
  user: { id: string; firstName: string; lastName: string; email: string; avatarUrl: string | null };
}

interface RoleRow {
  id: string;
  name: string;
  isSystem: boolean;
  permissions: string[];
}

/** Group the flat permission catalog by module for the matrix grid. */
function groupCatalog(): Map<string, PermissionEntry[]> {
  const groups = new Map<string, PermissionEntry[]>();
  for (const entry of PERMISSION_CATALOG) {
    const list = groups.get(entry.module) ?? [];
    list.push(entry);
    groups.set(entry.module, list);
  }
  return groups;
}

function roleHas(role: RoleRow, key: string): boolean {
  if (role.permissions.includes('*') || role.permissions.includes(key)) return true;
  const [module] = key.split('.');
  return role.permissions.includes(`${module}.*`);
}

function MembersTab() {
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 300);
  const [inviteOpen, setInviteOpen] = useState(false);
  const { data, isLoading } = useMembers({ search: debounced });
  const members = (data?.items ?? []) as unknown as MemberRow[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Search members..."
          className="max-w-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search members"
        />
        <Button onClick={() => setInviteOpen(true)}>Invite member</Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="text-right">Capacity (h/wk)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No members found.
                </TableCell>
              </TableRow>
            ) : (
              members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    {m.user.firstName} {m.user.lastName}
                  </TableCell>
                  <TableCell>{m.user.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{m.role.name}</Badge>
                  </TableCell>
                  <TableCell>{m.department ?? '—'}</TableCell>
                  <TableCell className="text-right">{Math.round(m.weeklyCapacityMins / 60)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}

function RolesTab() {
  const { data, isLoading } = useRoles();
  const roles = (data ?? []) as unknown as RoleRow[];
  const groups = useMemo(groupCatalog, []);

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([module, entries]) => (
        <Card key={module}>
          <CardHeader>
            <CardTitle className="capitalize text-base">{module}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-48">Permission</TableHead>
                  {roles.map((r) => (
                    <TableHead key={r.id} className="text-center whitespace-nowrap">
                      {r.name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.key}>
                    <TableCell className="font-mono text-xs">{entry.key}</TableCell>
                    {roles.map((r) => (
                      <TableCell key={r.id} className="text-center">
                        <Checkbox
                          checked={roleHas(r, entry.key)}
                          disabled
                          aria-label={`${r.name} has ${entry.key}`}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
      <p className="text-xs text-muted-foreground">
        The matrix is read-only here; edit custom roles via the API or an upcoming role editor. System
        roles cannot be modified.
      </p>
    </div>
  );
}

export default function TeamPage() {
  const { t } = useTerminology();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('team')}</h1>
        <p className="text-sm text-muted-foreground">Manage members, roles and permissions.</p>
      </div>
      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="roles">Roles &amp; permissions</TabsTrigger>
        </TabsList>
        <TabsContent value="members">
          <MembersTab />
        </TabsContent>
        <TabsContent value="roles">
          <RolesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
