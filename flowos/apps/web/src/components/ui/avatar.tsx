'use client';

import { useState } from 'react';
import { cn, initials } from '@/lib/utils';
import type { UserSummary } from '@/lib/types';

interface AvatarProps {
  src?: string | null;
  fallback: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  alt?: string;
}

const sizeClasses = { sm: 'h-6 w-6 text-[10px]', md: 'h-8 w-8 text-xs', lg: 'h-12 w-12 text-base' };

export function Avatar({ src, fallback, size = 'md', className, alt }: AvatarProps) {
  const [errored, setErrored] = useState(false);
  return (
    <span
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted font-medium text-muted-foreground',
        sizeClasses[size],
        className,
      )}
    >
      {src && !errored ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt ?? fallback} className="h-full w-full object-cover" onError={() => setErrored(true)} />
      ) : (
        <span aria-hidden>{fallback}</span>
      )}
    </span>
  );
}

export function UserAvatar({ user, size = 'md', className }: { user: UserSummary; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <Avatar
      src={user.avatarUrl}
      fallback={initials(user.firstName, user.lastName)}
      alt={`${user.firstName} ${user.lastName}`}
      size={size}
      className={className}
    />
  );
}
