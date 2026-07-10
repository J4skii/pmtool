'use client';

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

interface MenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  menuId: string;
}

const MenuContext = createContext<MenuContextValue | null>(null);

function useMenu(): MenuContextValue {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error('DropdownMenu components must be used within <DropdownMenu>');
  return ctx;
}

export function DropdownMenu({ children, className }: { children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
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
  }, [open]);

  return (
    <MenuContext.Provider value={{ open, setOpen, menuId }}>
      <div ref={rootRef} className={cn('relative inline-block', className)}>
        {children}
      </div>
    </MenuContext.Provider>
  );
}

export function DropdownMenuTrigger({ children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen, menuId } = useMenu();
  return (
    <button
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={menuId}
      onClick={() => setOpen(!open)}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownMenuContent({
  children,
  className,
  align = 'end',
}: {
  children: ReactNode;
  className?: string;
  align?: 'start' | 'end';
}) {
  const { open, menuId } = useMenu();
  if (!open) return null;
  return (
    <div
      id={menuId}
      role="menu"
      className={cn(
        'absolute z-50 mt-1 min-w-[10rem] animate-fade-in rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
        align === 'end' ? 'right-0' : 'left-0',
        className,
      )}
    >
      {children}
    </div>
  );
}

interface ItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  destructive?: boolean;
}

export function DropdownMenuItem({ children, className, destructive, onClick, ...props }: ItemProps) {
  const { setOpen } = useMenu();
  return (
    <button
      type="button"
      role="menuitem"
      onClick={(event) => {
        onClick?.(event);
        setOpen(false);
      }}
      className={cn(
        'flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none',
        'hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent disabled:pointer-events-none disabled:opacity-50',
        destructive && 'text-destructive hover:text-destructive',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownMenuSeparator() {
  return <div role="separator" className="-mx-1 my-1 h-px bg-border" />;
}

export function DropdownMenuLabel({ children }: { children: ReactNode }) {
  return <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{children}</div>;
}
