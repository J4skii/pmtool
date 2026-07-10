'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const SECTIONS = [
  { href: '/settings', label: 'Profile' },
  { href: '/settings/branding', label: 'Branding' },
  { href: '/settings/integrations', label: 'Integrations' },
  { href: '/settings/billing', label: 'Billing' },
] as const;

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Your profile, workspace branding and integrations.</p>
      </div>
      <div className="flex flex-col gap-8 lg:flex-row">
        <nav className="flex gap-1 lg:w-48 lg:flex-col" aria-label="Settings sections">
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className={cn(
                'rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent',
                pathname === s.href ? 'bg-accent font-medium' : 'text-muted-foreground',
              )}
            >
              {s.label}
            </Link>
          ))}
        </nav>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
