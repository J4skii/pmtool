import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { AppError, ERROR_CODES } from '@flowos/shared';
import type { AuthenticatedRequest, JwtPayload } from '../types';

/** Injects the verified JWT payload. Requires JwtAuthGuard. */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): JwtPayload => {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
  if (!request.user) {
    throw new AppError(ERROR_CODES.AUTH_TOKEN_INVALID, 'No authenticated user on request', 401);
  }
  return request.user;
});
