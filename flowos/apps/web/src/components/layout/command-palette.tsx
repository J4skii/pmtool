'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  FolderKanban,
  LayoutDashboard,
  Loader2,
  Search,
  Settings,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useTerminology } from '@/providers/terminology-provider';
import { useProjects } from '@/hooks/use-projects';
import { useDebounce } from '@/hooks/use-debounce';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PaletteItem {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  icon?: LucideIcon;
  group: 'Navigation' | 'Projects';
}

function PaletteContent({ onNavigate }: { onNavigate: () => void }) {
  const router = useRouter();
  const { t } = useTerminology();
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const debouncedQuery = useDebounce(query, 250);
  const listRef = useRef<HTMLDivElement>(null);

  const hasQuery = debouncedQuery.trim().length > 0;
  const projectsQuery = useProjects({ search: debouncedQuery.trim(), pageSize: 5 });
  const projectsFetching = hasQuery && projectsQuery.isFetching;

  const navItems = useMemo<PaletteItem[]>(
    () => [
      { id: 'nav-dashboard', label: t('dashboard'), href: '/', icon: LayoutDashboard, group: 'Navigation' },
      { id: 'nav-projects', label: t('projects'), href: '/projects', icon: FolderKanban, group: 'Navigation' },
      { id: 'nav-team', label: t('team'), href: '/team', icon: Users, group: 'Navigation' },
      { id: 'nav-reports', label: t('reports'), href: '/reports', icon: BarChart3, group: 'Navigation' },
      { id: 'nav-automations', label: t('automation'), href: '/automations', icon: Zap, group: 'Navigation' },
      { id: 'nav-settings', label: 'Settings', href: '/settings', icon: Settings, group: 'Navigation' },
    ],
    [t],
  );

  const items = useMemo<PaletteItem[]>(() => {
    const q = query.trim().toLowerCase();
    const nav = q ? navItems.filter((item) => item.label.toLowerCase().includes(q)) : navItems;
    const projects: PaletteItem[] = hasQuery
      ? (projectsQuery.data?.items ?? []).map((project) => ({
          id: `project-${project.id}`,
          label: project.name,
          sublabel: project.code ?? undefined,
          href: `/projects/${project.id}`,
          icon: FolderKanban,
          group: 'Projects' as const,
        }))
      : [];
    return [...nav, ...projects];
  }, [query, navItems, hasQuery, projectsQuery.data]);

  useEffect(() => {
    setHighlighted(0);
  }, [query, items.length]);

  const navigate = (item: PaletteItem) => {
    router.push(item.href);
    onNavigate();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlighted((prev) => (items.length === 0 ? 0 : (prev + 1) % items.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((prev) => (items.length === 0 ? 0 : (prev - 1 + items.length) % items.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = items[highlighted];
      if (item) navigate(item);
    }
  };

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlighted]);

  const activeId = items[highlighted]?.id;
  let lastGroup: PaletteItem['group'] | null = null;

  return (
    <div className="flex max-h-[70vh] flex-col">
      <div className="border-b p-3">
        <Input
          autoFocus
          aria-label="Search"
          role="combobox"
          aria-expanded
          aria-controls="command-palette-list"
          aria-activedescendant={activeId}
          placeholder="Search pages and projects…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>
      <div
        ref={listRef}
        id="command-palette-list"
        role="listbox"
        aria-label="Search results"
        className="flex-1 overflow-y-auto p-2"
      >
        {items.map((item, index) => {
          const showGroup = item.group !== lastGroup;
          lastGroup = item.group;
          const Icon = item.icon;
          return (
            <div key={item.id}>
              {showGroup ? (
                <div className="px-2 pb-1 pt-2 text-xs font-semibold text-muted-foreground">{item.group}</div>
              ) : null}
              <button
                type="button"
                id={item.id}
                role="option"
                aria-selected={index === highlighted}
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => navigate(item)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm',
                  index === highlighted ? 'bg-accent text-accent-foreground' : 'text-foreground',
                )}
              >
                {Icon ? <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
                <span className="truncate">{item.label}</span>
                {item.sublabel ? <span className="ml-auto text-xs text-muted-foreground">{item.sublabel}</span> : null}
              </button>
            </div>
          );
        })}
        {projectsFetching ? (
          <div className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground" aria-live="polite">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Searching projects…
          </div>
        ) : null}
        {items.length === 0 && !projectsFetching ? (
          <div className="px-2 py-8 text-center text-sm text-muted-foreground">No results</div>
        ) : null}
      </div>
    </div>
  );
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        aria-label="Open command palette"
        onClick={() => setOpen(true)}
        className="flex h-9 w-64 max-w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Search className="h-4 w-4 shrink-0" aria-hidden />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          Ctrl K
        </kbd>
      </button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Command palette"
        hideHeader
        className="max-w-xl overflow-hidden p-0"
      >
        {open ? <PaletteContent onNavigate={() => setOpen(false)} /> : null}
      </Dialog>
    </>
  );
}
