import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { AppError, ERROR_CODES } from '@flowos/shared';
import { PRISMA, type Db } from '../prisma.provider';
import type { AuthenticatedRequest } from '../types';

/**
 * Resolves the current tenant, in priority order:
 *   1. `tenantId` claim on the verified JWT
 *   2. `x-tenant-id` header
 *   3. subdomain of the Host header ({slug}.flowos.app)
 * Loads the tenant, rejects missing/soft-deleted (TENANT_NOT_FOUND) and
 * disabled (TENANT_INACTIVE) tenants, and attaches it as request.tenant.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(@Inject(PRISMA) private readonly db: Db) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const headerTenantId = this.headerValue(request.headers['x-tenant-id']);
    const tenantId = request.user?.tenantId ?? headerTenantId;
    const slug = tenantId ? null : this.slugFromHost(this.headerValue(request.headers['host']));

    if (!tenantId && !slug) {
      throw new AppError(ERROR_CODES.TENANT_NOT_FOUND, 'Unable to resolve tenant', 404);
    }

    const tenant = await this.db.tenant.findFirst({
      where: {
        deletedAt: null,
        ...(tenantId ? { id: tenantId } : { slug: slug ?? undefined }),
      },
    });

    if (!tenant) {
      throw new AppError(ERROR_CODES.TENANT_NOT_FOUND, 'Tenant not found', 404);
    }
    if (!tenant.isActive) {
      throw new AppError(ERROR_CODES.TENANT_INACTIVE, 'This workspace is inactive', 403);
    }

    request.tenant = tenant;
    return true;
  }

  private headerValue(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
  }

  /** "acme.flowos.app" → "acme"; bare hosts / localhost yield null. */
  private slugFromHost(host: string | undefined): string | null {
    if (!host) return null;
    const hostname = host.split(':')[0] ?? '';
    const parts = hostname.split('.');
    if (parts.length < 3) return null;
    const sub = parts[0];
    if (!sub || sub === 'www' || sub === 'api' || sub === 'app') return null;
    return sub;
  }
}
