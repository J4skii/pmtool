import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { PermissionEntry } from '@flowos/shared';
import type { Role, Tenant } from '@flowos/database';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { JwtPayload } from '../../common/types';
import { createRoleSchema, updateRoleSchema, type CreateRoleInput, type UpdateRoleInput } from './roles.dto';
import { RolesService } from './roles.service';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('catalog')
  @RequirePermissions('team.read')
  catalog(): readonly PermissionEntry[] {
    return this.rolesService.catalog();
  }

  @Get()
  @RequirePermissions('team.read')
  list(@CurrentTenant() tenant: Tenant): Promise<Role[]> {
    return this.rolesService.list(tenant.id);
  }

  @Post()
  @RequirePermissions('team.manage_roles')
  create(
    @Body(new ZodValidationPipe(createRoleSchema)) dto: CreateRoleInput,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): Promise<Role> {
    return this.rolesService.create(tenant.id, user.sub, dto);
  }

  @Patch(':roleId')
  @RequirePermissions('team.manage_roles')
  update(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body(new ZodValidationPipe(updateRoleSchema)) dto: UpdateRoleInput,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): Promise<Role> {
    return this.rolesService.update(tenant.id, user.sub, roleId, dto);
  }

  @Delete(':roleId')
  @RequirePermissions('team.manage_roles')
  remove(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ id: string }> {
    return this.rolesService.remove(tenant.id, user.sub, roleId);
  }
}
