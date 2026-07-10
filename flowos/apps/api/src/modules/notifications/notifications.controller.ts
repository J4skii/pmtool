import { Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { paginationSchema, type PaginationInput } from '@flowos/shared';
import type { Tenant } from '@flowos/database';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { JwtPayload } from '../../common/types';
import { NotificationsService } from './notifications.service';

// No PermissionsGuard: any authenticated member may read their own notifications.
@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard, TenantGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(paginationSchema)) query: PaginationInput,
    @Query('unread') unread: string | undefined,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<NotificationsService['list']> {
    return this.notificationsService.list(tenant.id, user.sub, query, unread === 'true');
  }

  @Patch(':id/read')
  markRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<NotificationsService['markRead']> {
    return this.notificationsService.markRead(tenant.id, user.sub, id);
  }

  @Post('read-all')
  markAllRead(
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<NotificationsService['markAllRead']> {
    return this.notificationsService.markAllRead(tenant.id, user.sub);
  }
}
