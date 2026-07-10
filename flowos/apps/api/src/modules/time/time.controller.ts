import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { createTimeEntrySchema, type CreateTimeEntryInput } from '@flowos/shared';
import type { Tenant } from '@flowos/database';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { JwtPayload } from '../../common/types';
import { listEntriesQuerySchema, startTimerSchema, type ListEntriesQuery, type StartTimerInput } from './time.dto';
import { TimeService } from './time.service';

@ApiTags('time')
@ApiBearerAuth()
@Controller('time')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class TimeController {
  constructor(private readonly timeService: TimeService) {}

  @Post('timer/start')
  @RequirePermissions('time.track')
  start(
    @Body(new ZodValidationPipe(startTimerSchema)) dto: StartTimerInput,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<TimeService['startTimer']> {
    return this.timeService.startTimer(tenant.id, user.sub, dto);
  }

  @Post('timer/stop')
  @RequirePermissions('time.track')
  stop(@CurrentTenant() tenant: Tenant, @CurrentUser() user: JwtPayload): ReturnType<TimeService['stopTimer']> {
    return this.timeService.stopTimer(tenant.id, user.sub);
  }

  @Get('timer/current')
  @RequirePermissions('time.track')
  current(@CurrentTenant() tenant: Tenant, @CurrentUser() user: JwtPayload): ReturnType<TimeService['currentTimer']> {
    return this.timeService.currentTimer(tenant.id, user.sub);
  }

  @Post('entries')
  @RequirePermissions('time.track')
  createManual(
    @Body(new ZodValidationPipe(createTimeEntrySchema)) dto: CreateTimeEntryInput,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<TimeService['createManual']> {
    return this.timeService.createManual(tenant.id, user.sub, dto);
  }

  @Get('entries')
  @RequirePermissions('time.read')
  list(
    @Query(new ZodValidationPipe(listEntriesQuerySchema)) query: ListEntriesQuery,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<TimeService['listEntries']> {
    return this.timeService.listEntries(tenant.id, user, query);
  }

  @Get('summary/week')
  @RequirePermissions('time.read')
  weekly(@CurrentTenant() tenant: Tenant, @CurrentUser() user: JwtPayload): ReturnType<TimeService['weeklySummary']> {
    return this.timeService.weeklySummary(tenant.id, user.sub);
  }
}
