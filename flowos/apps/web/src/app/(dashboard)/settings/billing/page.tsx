'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTerminology } from '@/providers/terminology-provider';

export default function BillingSettingsPage() {
  const { tenant } = useTerminology();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan &amp; billing</CardTitle>
        <CardDescription>Your subscription and payment details.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Current plan:</span>
          <Badge>{(tenant as { plan?: string } | null)?.plan ?? 'FREE'}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Self-serve upgrades via Stripe are on the roadmap. Contact support to change plans.
        </p>
      </CardContent>
    </Card>
  );
}
