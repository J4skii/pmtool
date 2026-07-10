import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppError, ERROR_CODES, hasPermission } from '@flowos/shared';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import type { AuthenticatedRequest } from '../types';

/**
 * Enforces @RequirePermissions() metadata (method-level overrides
 * class-level) against the permission list embedded in the JWT, using
 * the wildcard-aware hasPermission() from @flowos/shared.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const granted = request.user?.permissions ?? [];

    const missing = required.filter((key) => !hasPermission(granted, key));
    if (missing.length > 0) {
      throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Insufficient permissions', 403, { missing });
    }
    return true;
  }
}
