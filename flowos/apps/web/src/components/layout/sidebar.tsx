'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
  FolderKanban,
  LayoutDashboard,
  Settings,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useTerminology } from '@/providers/terminology-provider';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'flowos-sidebar-collapsed';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

function readCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function Sidebar() {
  const pathname = usePathname();
  const { t, tenant } = useTerminology();
  const [collapsed, setCollapsed] = useState<boolean>(readCollapsed);

  const items: NavItem[] = [
    { href: '/', label: t('dashboard'), icon: LayoutDashboard },
    { href: '/projects', label: t('projects'), icon: FolderKanban },
    { href: '/team', label: t('team'), icon: Users },
    { href: '/reports', label: t('reports'), icon: BarChart3 },
    { href: '/automations', label: t('automation'), icon: Zap },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Ignore storage errors (private mode, quota).
      }
      return next;
    });
  };

  const isActive = (href: string): boolean =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const tenantName = tenant?.name ?? 'FlowOS';
  const logoUrl = tenant?.branding?.logoUrl;

  return (
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col border-r bg-card transition-[width] duration-200',
        collapsed ? 'w-14' : 'w-60',
      )}
      aria-label="Main navigation"
    >
      <div className={cn('flex h-14 items-center gap-2 border-b px-3', collapsed && 'justify-center px-0')}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={`${tenantName} logo`} className="h-8 w-8 shrink-0 rounded-md object-contain" />
        ) : (
          <span
            aria-hidden
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground"
          >
            {tenantName.charAt(0).toUpperCase()}
          </span>
        )}
        {!collapsed ? <span className="truncate text-sm font-semibold">{tenantName}</span> : null}
      </div>

      <nav className="flex-1 overflow-y-auto p-2" aria-label="Primary">
        <ul className="space-y-1">
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  title={collapsed ? label : undefined}
                  aria-label={collapsed ? label : undefined}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    collapsed && 'justify-center px-0',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {!collapsed ? <span className="truncate">{label}</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t p-2">
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
            collapsed && 'justify-center px-0',
          )}
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <>
              <ChevronsLeft className="h-4 w-4 shrink-0" aria-hidden />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
