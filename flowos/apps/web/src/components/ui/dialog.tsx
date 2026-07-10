'use client';

import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
  title: string;
  description?: string;
  /** Hide the built-in header (title still used for aria-label). */
  hideHeader?: boolean;
}

/**
 * Accessible modal dialog: portal, backdrop, Escape to close,
 * focus moved into the panel on open and simple focus containment.
 */
export function Dialog({ open, onOpenChange, children, className, title, description, hideHeader }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onOpenChange(false);
      }
      if (event.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    },
    [onOpenChange],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', onKeyDown);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => {
      const target = panelRef.current?.querySelector<HTMLElement>(
        'input, textarea, select, button:not([data-dialog-close])',
      );
      (target ?? panelRef.current)?.focus();
    }, 0);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(timer);
      document.body.style.overflow = '';
      previouslyFocused?.focus();
    };
  }, [open, onKeyDown]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close dialog"
        className="fixed inset-0 cursor-default bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'relative z-10 w-full max-w-lg animate-zoom-in rounded-lg border bg-card p-6 text-card-foreground shadow-lg',
          className,
        )}
      >
        {!hideHeader ? (
          <div className="mb-4 space-y-1 pr-8">
            <h2 className="text-lg font-semibold">{title}</h2>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
        ) : null}
        <button
          type="button"
          data-dialog-close
          onClick={() => onOpenChange(false)}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-sm text-muted-foreground opacity-70 transition-opacity hover:opacity-100"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function DialogFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mt-6 flex justify-end gap-2', className)}>{children}</div>;
}
