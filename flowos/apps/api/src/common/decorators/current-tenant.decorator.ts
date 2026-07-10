import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { AppError, ERROR_CODES } from '@flowos/shared';
import type { Tenant } from '@flowos/database';
import type { AuthenticatedRequest } from '../types';

/** Injects the resolved Tenant row. Requires TenantGuard. */
export const CurrentTenant = createParamDecorator((_data: unknown, context: ExecutionContext): Tenant => {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
  if (!request.tenant) {
    throw new AppError(ERROR_CODES.TENANT_NOT_FOUND, 'No tenant resolved on request', 404);
  }
  return request.tenant;
});
