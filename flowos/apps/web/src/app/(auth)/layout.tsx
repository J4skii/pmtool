import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="text-2xl font-bold tracking-tight">FlowOS</span>
          <p className="mt-1 text-sm text-muted-foreground">Your project management operating system</p>
        </div>
        {children}
      </div>
    </main>
  );
}
