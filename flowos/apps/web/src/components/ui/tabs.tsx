'use client';

import { createContext, useContext, useId, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs components must be used within <Tabs>');
  return ctx;
}

interface TabsProps {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export function Tabs({ defaultValue, value: controlled, onValueChange, children, className }: TabsProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const value = controlled ?? uncontrolled;
  const baseId = useId();
  const setValue = (next: string) => {
    setUncontrolled(next);
    onValueChange?.(next);
  };
  return (
    <TabsContext.Provider value={{ value, setValue, baseId }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground', className)}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  const { value: active, setValue, baseId } = useTabs();
  const selected = active === value;
  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-selected={selected}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={selected ? 0 : -1}
      onClick={() => setValue(value)}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
        const tabs = Array.from(
          event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [],
        );
        const index = tabs.indexOf(event.currentTarget);
        const next = tabs[(index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        next?.focus();
        next?.click();
      }}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all',
        selected ? 'bg-background text-foreground shadow' : 'hover:text-foreground',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  const { value: active, baseId } = useTabs();
  if (active !== value) return null;
  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      tabIndex={0}
      className={cn('mt-4 focus-visible:outline-none', className)}
    >
      {children}
    </div>
  );
}
