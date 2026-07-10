'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  error: Error | null;
}

/** Catches render errors in async views and shows a retryable fallback. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught', error, info);
  }

  private reset = () => this.setState({ error: null });

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div role="alert" className="flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden />
          <div>
            <p className="font-medium">{this.props.fallbackTitle ?? 'Something went wrong'}</p>
            <p className="mt-1 text-sm text-muted-foreground">{this.state.error.message}</p>
          </div>
          <Button variant="outline" size="sm" onClick={this.reset}>
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Inline error state for failed queries. */
export function QueryError({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border p-8 text-center">
      <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden />
      <p className="text-sm text-muted-foreground">{message ?? 'Failed to load data.'}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
