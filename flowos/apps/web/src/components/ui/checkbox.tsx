'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="checkbox"
    className={cn(
      'h-4 w-4 shrink-0 cursor-pointer rounded border-input text-primary accent-[hsl(var(--primary))]',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
Checkbox.displayName = 'Checkbox';
