import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { paginationSchema, type PaginationInput } from '@flowos/shared';
import type { Membership, Tenant } from '@flowos/database';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { JwtPayload } from '../../common/types';
import { inviteUserSchema, updateMembershipSchema, type InviteUserInput, type UpdateMembershipInput } from './users.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('team.read')
  list(
    @Query(new ZodValidationPipe(paginationSchema)) query: PaginationInput,
    @CurrentTenant() tenant: Tenant,
  ): ReturnType<UsersService['list']> {
    return this.usersService.list(tenant.id, query);
  }

  @Post('invite')
  @RequirePermissions('team.invite')
  invite(
    @Body(new ZodValidationPipe(inviteUserSchema)) dto: InviteUserInput,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): Promise<Membership> {
    return this.usersService.invite(tenant.id, user.sub, dto);
  }

  @Patch(':membershipId')
  @RequirePermissions('team.update')
  updateMembership(
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @Body(new ZodValidationPipe(updateMembershipSchema)) dto: UpdateMembershipInput,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): Promise<Membership> {
    return this.usersService.updateMembership(tenant.id, user.sub, membershipId, dto);
  }

  @Delete(':membershipId')
  @RequirePermissions('team.remove')
  deactivate(
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ id: string }> {
    return this.usersService.deactivate(tenant.id, user.sub, membershipId);
  }
}
