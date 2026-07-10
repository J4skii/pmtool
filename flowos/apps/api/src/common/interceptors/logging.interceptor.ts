import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { tap, type Observable } from 'rxjs';
import type { AuthenticatedRequest } from '../types';

/** Structured per-request log line: method, path, user, tenant, duration. */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const started = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.log(request, started),
        error: () => this.log(request, started),
      }),
    );
  }

  private log(request: AuthenticatedRequest, started: number): void {
    this.logger.log(
      `${request.method} ${request.url} user=${request.user?.sub ?? '-'} tenant=${request.tenant?.id ?? '-'} ${Date.now() - started}ms`,
    );
  }
}
