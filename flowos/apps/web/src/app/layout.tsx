import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AppProviders } from '@/providers/app-providers';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'FlowOS', template: '%s · FlowOS' },
  description: 'White-label project management operating system',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0f19' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
