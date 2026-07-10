'use client';

import { DEFAULT_TERMINOLOGY, INDUSTRY_TERMINOLOGY, type TerminologyKey } from '@flowos/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export const INDUSTRY_KEYS = [
  'construction',
  'software',
  'healthcare',
  'events',
  'marketing',
  'manufacturing',
  'services',
  'general',
] as const;

export type IndustryKey = (typeof INDUSTRY_KEYS)[number];

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function previewTerms(key: IndustryKey): string[] {
  const overrides = INDUSTRY_TERMINOLOGY[key] ?? {};
  const entries = Object.entries(overrides) as Array<[TerminologyKey, string]>;
  if (entries.length === 0) return ['Standard terminology'];
  return entries.slice(0, 3).map(([term, replacement]) => `${DEFAULT_TERMINOLOGY[term]} → ${replacement}`);
}

interface IndustryStepProps {
  value: IndustryKey | null;
  onSelect: (industry: IndustryKey) => void;
  onContinue: () => void;
}

export function IndustryStep({ value, onSelect, onContinue }: IndustryStepProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {INDUSTRY_KEYS.map((key) => {
          const selected = value === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              aria-pressed={selected}
              className={cn(
                'rounded-lg border bg-card p-4 text-left shadow-sm transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                selected && 'ring-2 ring-primary',
              )}
            >
              <span className="block font-medium">{capitalize(key)}</span>
              <span className="mt-1 block space-y-0.5">
                {previewTerms(key).map((line) => (
                  <span key={line} className="block text-xs text-muted-foreground">
                    {line}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex justify-end">
        <Button type="button" onClick={onContinue} disabled={value === null}>
          Continue
        </Button>
      </div>
    </div>
  );
}
