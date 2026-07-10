import type { Tenant } from '@flowos/database';
import type { Request } from 'express';

/** JWT access-token payload. */
export interface JwtPayload {
  /** User id */
  sub: string;
  email: string;
  tenantId: string;
  roleId: string;
  permissions: string[];
}

/** Express request enriched by JwtAuthGuard + TenantGuard. */
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  tenant?: Tenant;
}
