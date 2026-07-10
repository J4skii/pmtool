'use client';

import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { QueryProvider } from './query-provider';
import { ThemeProvider } from './theme-provider';
import { TerminologyProvider } from './terminology-provider';
import { BrandingProvider } from './branding-provider';
import { SocketProvider } from './socket-provider';
import { PwaRegister } from '@/components/pwa-register';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider>
        <TerminologyProvider>
          <BrandingProvider>
            <SocketProvider>
              {children}
              <Toaster richColors position="bottom-right" />
              <PwaRegister />
            </SocketProvider>
          </BrandingProvider>
        </TerminologyProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}
