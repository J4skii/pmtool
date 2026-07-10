import { Inject, Injectable } from '@nestjs/common';
import { AppError, DEFAULT_TERMINOLOGY, ERROR_CODES } from '@flowos/shared';
import type { Organization, Tenant } from '@flowos/database';
import { PRISMA, type Db } from '../../common/prisma.provider';
import { AuditService } from '../../common/services/audit.service';
import type {
  UpdateBrandingInput,
  UpdateModulesInput,
  UpdateOrganizationInput,
  UpdateTerminologyInput,
} from './tenants.dto';

@Injectable()
export class TenantsService {
  constructor(
    @Inject(PRISMA) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  async getCurrent(tenantId: string): Promise<{ tenant: Tenant; organization: Organization | null }> {
    const tenant = await this.db.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      include: { organization: true },
    });
    if (!tenant) throw new AppError(ERROR_CODES.TENANT_NOT_FOUND, 'Tenant not found', 404);
    const { organization, ...rest } = tenant;
    return { tenant: rest as Tenant, organization };
  }

  async updateOrganization(tenantId: string, userId: string, input: UpdateOrganizationInput): Promise<Organization> {
    const org = await this.requireOrganization(tenantId);
    const updated = await this.db.organization.update({ where: { id: org.id }, data: input });
    this.audit.writeAudit({ tenantId, userId, action: 'settings.organization_updated', metadata: { ...input } });
    return updated;
  }

  /** Merge branding "skin" keys into the existing JSON (shallow). */
  async updateBranding(tenantId: string, userId: string, input: UpdateBrandingInput): Promise<Organization> {
    const org = await this.requireOrganization(tenantId);
    const current = this.asRecord(org.branding);
    const updated = await this.db.organization.update({
      where: { id: org.id },
      data: { branding: { ...current, ...input } as object },
    });
    this.audit.writeAudit({ tenantId, userId, action: 'branding.updated', metadata: { keys: Object.keys(input) } });
    return updated;
  }

  async getTerminology(tenantId: string): Promise<Record<string, string>> {
    const org = await this.requireOrganization(tenantId);
    const branding = this.asRecord(org.branding);
    const overrides = this.asRecord(branding['terminology']) as Record<string, string>;
    return { ...DEFAULT_TERMINOLOGY, ...overrides };
  }

  async updateTerminology(tenantId: string, userId: string, input: UpdateTerminologyInput): Promise<Record<string, string>> {
    const org = await this.requireOrganization(tenantId);
    const branding = this.asRecord(org.branding);
    const merged = { ...(this.asRecord(branding['terminology']) as Record<string, string>), ...input };
    await this.db.organization.update({
      where: { id: org.id },
      data: { branding: { ...branding, terminology: merged } as object },
    });
    this.audit.writeAudit({ tenantId, userId, action: 'branding.terminology_updated', metadata: { keys: Object.keys(input) } });
    return { ...DEFAULT_TERMINOLOGY, ...merged };
  }

  /** Toggle feature modules on the tenant (merged shallowly). */
  async updateModules(tenantId: string, userId: string, input: UpdateModulesInput): Promise<Record<string, boolean>> {
    const tenant = await this.db.tenant.findFirst({ where: { id: tenantId, deletedAt: null } });
    if (!tenant) throw new AppError(ERROR_CODES.TENANT_NOT_FOUND, 'Tenant not found', 404);
    const merged = { ...(this.asRecord(tenant.enabledModules) as Record<string, boolean>), ...input };
    await this.db.tenant.update({ where: { id: tenantId }, data: { enabledModules: merged as object } });
    this.audit.writeAudit({ tenantId, userId, action: 'settings.modules_updated', metadata: { ...input } });
    return merged;
  }

  private async requireOrganization(tenantId: string): Promise<Organization> {
    const org = await this.db.organization.findFirst({ where: { tenantId, deletedAt: null } });
    if (!org) throw new AppError(ERROR_CODES.NOT_FOUND, 'Organization not found', 404);
    return org;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }
}
