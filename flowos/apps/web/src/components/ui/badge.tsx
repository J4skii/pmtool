import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import type { ProjectStatus, TaskPriority } from '@/lib/types';

type Variant = 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning';

const variantClasses: Record<Variant, string> = {
  default: 'border-transparent bg-primary text-primary-foreground',
  secondary: 'border-transparent bg-secondary text-secondary-foreground',
  outline: 'text-foreground',
  destructive: 'border-transparent bg-destructive text-destructive-foreground',
  success: 'border-transparent bg-success text-success-foreground',
  warning: 'border-transparent bg-warning text-warning-foreground',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}

const statusVariant: Record<ProjectStatus, Variant> = {
  PLANNING: 'secondary',
  ACTIVE: 'success',
  ON_HOLD: 'warning',
  COMPLETED: 'default',
  ARCHIVED: 'outline',
  CANCELLED: 'destructive',
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge variant={statusVariant[status]}>{status.replace('_', ' ')}</Badge>;
}

const priorityVariant: Record<TaskPriority, Variant> = {
  URGENT: 'destructive',
  HIGH: 'warning',
  NORMAL: 'secondary',
  LOW: 'outline',
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return <Badge variant={priorityVariant[priority]}>{priority}</Badge>;
}
