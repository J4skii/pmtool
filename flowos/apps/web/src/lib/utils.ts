import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind class names, resolving conflicts. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format minor currency units (cents) for display. */
export function formatCents(cents: string | number | null | undefined, currency = 'USD'): string {
  if (cents === null || cents === undefined) return '—';
  const value = typeof cents === 'string' ? Number(cents) : cents;
  if (Number.isNaN(value)) return '—';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value / 100);
}

/** Format a minutes duration as "3h 20m". */
export function formatMins(mins: number | null | undefined): string {
  if (mins === null || mins === undefined) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Initials for avatar fallbacks. */
export function initials(firstName?: string | null, lastName?: string | null): string {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?';
}

/** Convert a #rrggbb hex color to an "H S% L%" triple for CSS variables. */
export function hexToHslTriple(hex: string): string | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match || !match[1]) return null;
  const int = parseInt(match[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
