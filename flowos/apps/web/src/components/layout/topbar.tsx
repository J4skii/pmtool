'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommandPalette } from '@/components/layout/command-palette';
import { NotificationBell } from '@/components/layout/notification-bell';
import { UserMenu } from '@/components/layout/user-menu';

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <span className="inline-block h-9 w-9" aria-hidden />;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
    </Button>
  );
}

export function Topbar() {
  return (
    <header className="flex h-14 items-center gap-2 border-b px-4">
      <CommandPalette />
      <div className="flex-1" />
      <ThemeToggle />
      <NotificationBell />
      <UserMenu />
    </header>
  );
}
