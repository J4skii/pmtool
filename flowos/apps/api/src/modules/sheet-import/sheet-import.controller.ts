import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { importSheetSchema, previewSheetSchema, type ImportSheetInput, type PreviewSheetInput } from '@flowos/shared';
import type { Project, Tenant } from '@flowos/database';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { JwtPayload } from '../../common/types';
import { SheetImportService } from './sheet-import.service';

@ApiTags('sheet-import')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class SheetImportController {
  constructor(private readonly sheetImportService: SheetImportService) {}

  @Get('projects/import/sheet/service-account')
  @RequirePermissions('projects.create')
  serviceAccount(): { email: string | null } {
    return { email: this.sheetImportService.serviceAccountEmail };
  }

  @Post('projects/import/sheet/preview')
  @RequirePermissions('projects.create')
  preview(
    @Body(new ZodValidationPipe(previewSheetSchema)) dto: PreviewSheetInput,
  ): ReturnType<SheetImportService['preview']> {
    return this.sheetImportService.preview(dto);
  }

  @Post('projects/import/sheet')
  @RequirePermissions('projects.create')
  create(
    @Body(new ZodValidationPipe(importSheetSchema)) dto: ImportSheetInput,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): Promise<Project> {
    return this.sheetImportService.createProjectFromSheet(tenant.id, user.sub, dto);
  }

  @Post('projects/:id/resync-sheet')
  @RequirePermissions('projects.update')
  resync(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<SheetImportService['resync']> {
    return this.sheetImportService.resync(tenant.id, user.sub, id);
  }

  @Get('projects/:id/sheet-import')
  @RequirePermissions('projects.read')
  getImportInfo(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: Tenant,
  ): ReturnType<SheetImportService['getImportInfo']> {
    return this.sheetImportService.getImportInfo(tenant.id, id);
  }
}
