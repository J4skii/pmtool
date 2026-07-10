'use client';

import { useRouter } from 'next/navigation';
import { LogOut, Settings, User } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { UserAvatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export function UserMenu() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  if (!user) return null;

  const onLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="Open user menu" className="rounded-full">
        <UserAvatar user={user} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <span className="block truncate text-sm font-medium text-foreground">
            {user.firstName} {user.lastName}
          </span>
          <span className="block truncate font-normal">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/settings/profile')}>
          <User className="h-4 w-4" aria-hidden />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/settings')}>
          <Settings className="h-4 w-4" aria-hidden />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onClick={onLogout}>
          <LogOut className="h-4 w-4" aria-hidden />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
