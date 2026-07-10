import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Tenant } from '@flowos/database';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { JwtPayload } from '../../common/types';
import {
  confirmUploadSchema,
  createFolderSchema,
  listFilesQuerySchema,
  presignUploadSchema,
  type ConfirmUploadInput,
  type CreateFolderInput,
  type ListFilesQuery,
  type PresignUploadInput,
} from './files.dto';
import { FilesService } from './files.service';

@ApiTags('files')
@ApiBearerAuth()
@Controller('files')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('presign')
  @RequirePermissions('files.upload')
  presign(
    @Body(new ZodValidationPipe(presignUploadSchema)) dto: PresignUploadInput,
    @CurrentTenant() tenant: Tenant,
  ): ReturnType<FilesService['presignUpload']> {
    return this.filesService.presignUpload(tenant.id, dto);
  }

  @Post('confirm')
  @RequirePermissions('files.upload')
  confirm(
    @Body(new ZodValidationPipe(confirmUploadSchema)) dto: ConfirmUploadInput,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<FilesService['confirmUpload']> {
    return this.filesService.confirmUpload(tenant.id, user.sub, dto);
  }

  @Post(':id/versions')
  @RequirePermissions('files.manage_versions')
  addVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(confirmUploadSchema)) dto: ConfirmUploadInput,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<FilesService['addVersion']> {
    return this.filesService.addVersion(tenant.id, user.sub, id, dto);
  }

  @Get(':id/download')
  @RequirePermissions('files.download')
  download(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<FilesService['downloadUrl']> {
    return this.filesService.downloadUrl(tenant.id, user.sub, id);
  }

  @Get()
  @RequirePermissions('files.read')
  list(
    @Query(new ZodValidationPipe(listFilesQuerySchema)) query: ListFilesQuery,
    @CurrentTenant() tenant: Tenant,
  ): ReturnType<FilesService['list']> {
    return this.filesService.list(tenant.id, query);
  }

  @Get('expiring')
  @RequirePermissions('files.read')
  expiring(@Query('days') days: string | undefined, @CurrentTenant() tenant: Tenant): ReturnType<FilesService['expiring']> {
    return this.filesService.expiring(tenant.id, Math.min(365, Math.max(1, Number(days ?? 30))));
  }

  @Delete(':id')
  @RequirePermissions('files.delete')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<FilesService['softDelete']> {
    return this.filesService.softDelete(tenant.id, user.sub, id);
  }

  @Post('folders')
  @RequirePermissions('files.upload')
  createFolder(
    @Body(new ZodValidationPipe(createFolderSchema)) dto: CreateFolderInput,
    @CurrentTenant() tenant: Tenant,
  ): ReturnType<FilesService['createFolder']> {
    return this.filesService.createFolder(tenant.id, dto);
  }

  @Get('folders/list')
  @RequirePermissions('files.read')
  listFolders(
    @Query('projectId') projectId: string | undefined,
    @CurrentTenant() tenant: Tenant,
  ): ReturnType<FilesService['listFolders']> {
    return this.filesService.listFolders(tenant.id, projectId);
  }

  @Delete('folders/:id')
  @RequirePermissions('files.delete')
  deleteFolder(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: Tenant,
  ): ReturnType<FilesService['deleteFolder']> {
    return this.filesService.deleteFolder(tenant.id, id);
  }
}
