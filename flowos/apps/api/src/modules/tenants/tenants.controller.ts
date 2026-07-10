import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Organization, Tenant } from '@flowos/database';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { JwtPayload } from '../../common/types';
import {
  updateBrandingSchema,
  updateModulesSchema,
  updateOrganizationSchema,
  updateTerminologySchema,
  type UpdateBrandingInput,
  type UpdateModulesInput,
  type UpdateOrganizationInput,
  type UpdateTerminologyInput,
} from './tenants.dto';
import { TenantsService } from './tenants.service';

@ApiTags('tenants')
@ApiBearerAuth()
@Controller('tenant')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @RequirePermissions('settings.read')
  getCurrent(@CurrentTenant() tenant: Tenant): Promise<{ tenant: Tenant; organization: Organization | null }> {
    return this.tenantsService.getCurrent(tenant.id);
  }

  @Patch('organization')
  @RequirePermissions('settings.update')
  updateOrganization(
    @Body(new ZodValidationPipe(updateOrganizationSchema)) dto: UpdateOrganizationInput,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): Promise<Organization> {
    return this.tenantsService.updateOrganization(tenant.id, user.sub, dto);
  }

  @Patch('branding')
  @RequirePermissions('branding.update')
  updateBranding(
    @Body(new ZodValidationPipe(updateBrandingSchema)) dto: UpdateBrandingInput,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): Promise<Organization> {
    return this.tenantsService.updateBranding(tenant.id, user.sub, dto);
  }

  @Get('terminology')
  getTerminology(@CurrentTenant() tenant: Tenant): Promise<Record<string, string>> {
    return this.tenantsService.getTerminology(tenant.id);
  }

  @Patch('terminology')
  @RequirePermissions('branding.manage_terminology')
  updateTerminology(
    @Body(new ZodValidationPipe(updateTerminologySchema)) dto: UpdateTerminologyInput,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): Promise<Record<string, string>> {
    return this.tenantsService.updateTerminology(tenant.id, user.sub, dto);
  }

  @Patch('modules')
  @RequirePermissions('settings.update')
  updateModules(
    @Body(new ZodValidationPipe(updateModulesSchema)) dto: UpdateModulesInput,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): Promise<Record<string, boolean>> {
    return this.tenantsService.updateModules(tenant.id, user.sub, dto);
  }
}
