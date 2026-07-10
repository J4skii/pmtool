'use client';

import { useMemo, type ReactNode } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { hexToHslTriple } from '@/lib/utils';

/**
 * Injects tenant theme colors as CSS variables into :root at runtime.
 * Branding theme values are hex colors keyed by variable name
 * (e.g. { primary: "#4f46e5" }) and converted to the hsl triple format
 * used by tailwind.config.ts.
 */
export function BrandingProvider({ children }: { children: ReactNode }) {
  const tenant = useAuthStore((state) => state.tenant);

  const css = useMemo(() => {
    const theme = tenant?.branding?.theme;
    if (!theme) return '';
    const lines: string[] = [];
    for (const [name, hex] of Object.entries(theme)) {
      if (!/^[a-z0-9-]+$/i.test(name)) continue; // sanitize var names
      const triple = hexToHslTriple(hex);
      if (triple) lines.push(`--${name}: ${triple};`);
    }
    return lines.length > 0 ? `:root { ${lines.join(' ')} }` : '';
  }, [tenant]);

  return (
    <>
      {css ? <style id="tenant-branding" dangerouslySetInnerHTML={{ __html: css }} /> : null}
      {children}
    </>
  );
}
