import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { AppError, ERROR_CODES, type ApiErrorBody, type ErrorCode } from '@flowos/shared';
import { Prisma } from '@flowos/database';
import type { Response } from 'express';

/**
 * Global exception filter.
 * Every error leaves the API as: { error: { code, message, details? } }.
 * - AppError            → its own httpStatus + code
 * - Prisma known errors → P2002 CONFLICT (409), P2025 NOT_FOUND (404)
 * - HttpException       → mapped to a generic code with its status
 * - anything else       → INTERNAL 500 (stack never leaked outside dev)
 */
@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, body } = this.toResponse(exception);

    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.message : 'Unknown error',
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json(body);
  }

  private toResponse(exception: unknown): { status: number; body: ApiErrorBody } {
    if (exception instanceof AppError) {
      return { status: exception.httpStatus, body: exception.toBody() };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return this.body(HttpStatus.CONFLICT, ERROR_CODES.CONFLICT, 'A record with this value already exists', {
          target: exception.meta?.['target'],
        });
      }
      if (exception.code === 'P2025') {
        return this.body(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, 'Record not found');
      }
      return this.body(HttpStatus.BAD_REQUEST, ERROR_CODES.INTERNAL, 'Database request failed');
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code: ErrorCode =
        status === HttpStatus.NOT_FOUND
          ? ERROR_CODES.NOT_FOUND
          : status === HttpStatus.FORBIDDEN
            ? ERROR_CODES.FORBIDDEN
            : status === HttpStatus.TOO_MANY_REQUESTS
              ? ERROR_CODES.RATE_LIMITED
              : status === HttpStatus.UNAUTHORIZED
                ? ERROR_CODES.AUTH_TOKEN_INVALID
                : status >= 500
                  ? ERROR_CODES.INTERNAL
                  : ERROR_CODES.VALIDATION_FAILED;
      return this.body(status, code, exception.message);
    }

    // Unknown error — never leak internals outside development.
    const isDev = process.env.NODE_ENV === 'development';
    const message = isDev && exception instanceof Error ? exception.message : 'Internal server error';
    return this.body(HttpStatus.INTERNAL_SERVER_ERROR, ERROR_CODES.INTERNAL, message);
  }

  private body(status: number, code: ErrorCode, message: string, details?: unknown): { status: number; body: ApiErrorBody } {
    return { status, body: { error: { code, message, ...(details !== undefined ? { details } : {}) } } };
  }
}
