'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const INTEGRATIONS = [
  { name: 'Slack', description: 'Post automation updates to channels' },
  { name: 'Google Drive', description: 'Bridge your Drive into the file library' },
  { name: 'Xero', description: 'Sync invoices and expenses' },
  { name: 'QuickBooks', description: 'Two-way accounting sync' },
  { name: 'Stripe', description: 'Take client portal payments' },
  { name: 'DocuSign', description: 'E-signatures on documents' },
] as const;

export default function IntegrationsSettingsPage() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {INTEGRATIONS.map((integration) => (
        <Card key={integration.name}>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-base">{integration.name}</CardTitle>
              <CardDescription>{integration.description}</CardDescription>
            </div>
            <Badge variant="secondary">Coming soon</Badge>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" disabled>
              Connect
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
