import { SetMetadata, type CustomDecorator } from '@nestjs/common';

export const PERMISSIONS_KEY = 'flowos:required-permissions';

/**
 * Declares the permission keys required to invoke a handler (all must be
 * granted). Enforced by PermissionsGuard against the JWT permission list.
 *
 *   @RequirePermissions('projects.create')
 */
export const RequirePermissions = (...permissions: string[]): CustomDecorator<string> =>
  SetMetadata(PERMISSIONS_KEY, permissions);
