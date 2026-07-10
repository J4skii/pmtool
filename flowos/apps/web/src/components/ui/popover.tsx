'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
  align?: 'start' | 'end';
  triggerClassName?: string;
  triggerLabel: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** Lightweight popover: trigger button + floating panel with outside-click / Escape dismissal. */
export function Popover({
  trigger,
  children,
  className,
  align = 'end',
  triggerClassName,
  triggerLabel,
  open: controlledOpen,
  onOpenChange,
}: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={triggerLabel}
        onClick={() => setOpen(!open)}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={triggerLabel}
          className={cn(
            'absolute z-50 mt-1 w-80 animate-fade-in rounded-md border bg-popover p-3 text-popover-foreground shadow-md',
            align === 'end' ? 'right-0' : 'left-0',
            className,
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
