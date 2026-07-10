import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
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
  createCommentSchema,
  listCommentsQuerySchema,
  updateCommentSchema,
  type CreateCommentInput,
  type ListCommentsQuery,
  type UpdateCommentInput,
} from './comments.dto';
import { CommentsService } from './comments.service';

@ApiTags('comments')
@ApiBearerAuth()
@Controller('comments')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @RequirePermissions('comments.read')
  list(
    @Query(new ZodValidationPipe(listCommentsQuerySchema)) query: ListCommentsQuery,
    @CurrentTenant() tenant: Tenant,
  ): ReturnType<CommentsService['list']> {
    return this.commentsService.list(tenant.id, query);
  }

  @Post()
  @RequirePermissions('comments.create')
  create(
    @Body(new ZodValidationPipe(createCommentSchema)) dto: CreateCommentInput,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<CommentsService['create']> {
    return this.commentsService.create(tenant.id, user.sub, dto);
  }

  @Patch(':id')
  @RequirePermissions('comments.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateCommentSchema)) dto: UpdateCommentInput,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<CommentsService['update']> {
    return this.commentsService.update(tenant.id, user, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('comments.delete')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<CommentsService['softDelete']> {
    return this.commentsService.softDelete(tenant.id, user, id);
  }
}
