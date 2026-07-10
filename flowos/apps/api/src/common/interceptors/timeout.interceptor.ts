import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { AppError, ERROR_CODES } from '@flowos/shared';
import { catchError, throwError, timeout, TimeoutError, type Observable } from 'rxjs';

const REQUEST_TIMEOUT_MS = 30_000;

/** Aborts any request taking longer than 30 seconds. */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
    return next.handle().pipe(
      timeout(REQUEST_TIMEOUT_MS),
      catchError((err: unknown) =>
        throwError(() =>
          err instanceof TimeoutError
            ? new AppError(ERROR_CODES.SERVICE_UNAVAILABLE, 'Request timed out', 503)
            : err,
        ),
      ),
    );
  }
}
