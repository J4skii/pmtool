import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  createProjectSchema,
  updateProjectSchema,
  type CreateProjectInput,
  type UpdateProjectInput,
} from '@flowos/shared';
import type { Project, ProjectMember, Stage, Tenant } from '@flowos/database';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { JwtPayload } from '../../common/types';
import {
  addProjectMemberSchema,
  createStageSchema,
  listProjectsQuerySchema,
  reorderStagesSchema,
  updateStageSchema,
  type AddProjectMemberInput,
  type CreateStageInput,
  type ListProjectsQuery,
  type ReorderStagesInput,
  type UpdateStageInput,
} from './projects.dto';
import { ProjectsService, type ProjectBudget, type ProjectProgress } from './projects.service';

@ApiTags('projects')
@ApiBearerAuth()
@Controller('projects')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @RequirePermissions('projects.read')
  list(
    @Query(new ZodValidationPipe(listProjectsQuerySchema)) query: ListProjectsQuery,
    @CurrentTenant() tenant: Tenant,
  ): ReturnType<ProjectsService['list']> {
    return this.projectsService.list(tenant.id, query);
  }

  @Get(':id')
  @RequirePermissions('projects.read')
  getById(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenant: Tenant): Promise<Project> {
    return this.projectsService.getById(tenant.id, id);
  }

  @Post()
  @RequirePermissions('projects.create')
  create(
    @Body(new ZodValidationPipe(createProjectSchema)) dto: CreateProjectInput,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): Promise<Project> {
    return this.projectsService.create(tenant.id, user.sub, dto);
  }

  @Patch(':id')
  @RequirePermissions('projects.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateProjectSchema)) dto: UpdateProjectInput,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): Promise<Project> {
    return this.projectsService.update(tenant.id, user.sub, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('projects.delete')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ id: string }> {
    return this.projectsService.remove(tenant.id, user.sub, id);
  }

  @Post(':id/archive')
  @RequirePermissions('projects.archive')
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): Promise<Project> {
    return this.projectsService.archive(tenant.id, user.sub, id);
  }

  @Post(':id/duplicate')
  @RequirePermissions('projects.duplicate')
  duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): Promise<Project> {
    return this.projectsService.duplicate(tenant.id, user.sub, id);
  }

  @Get(':id/progress')
  @RequirePermissions('projects.read')
  progress(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenant: Tenant): Promise<ProjectProgress> {
    return this.projectsService.progress(tenant.id, id);
  }

  @Get(':id/budget')
  @RequirePermissions('finance.budgets.read')
  budget(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenant: Tenant): Promise<ProjectBudget> {
    return this.projectsService.budget(tenant.id, id);
  }

  // --- Stages ---

  @Post(':id/stages')
  @RequirePermissions('projects.manage_stages')
  createStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(createStageSchema)) dto: CreateStageInput,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): Promise<Stage> {
    return this.projectsService.createStage(tenant.id, user.sub, id, dto);
  }

  @Patch(':id/stages/:stageId')
  @RequirePermissions('projects.manage_stages')
  updateStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stageId', ParseUUIDPipe) stageId: string,
    @Body(new ZodValidationPipe(updateStageSchema)) dto: UpdateStageInput,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): Promise<Stage> {
    return this.projectsService.updateStage(tenant.id, user.sub, id, stageId, dto);
  }

  @Delete(':id/stages/:stageId')
  @RequirePermissions('projects.manage_stages')
  deleteStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stageId', ParseUUIDPipe) stageId: string,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ id: string }> {
    return this.projectsService.deleteStage(tenant.id, user.sub, id, stageId);
  }

  @Post(':id/stages/reorder')
  @RequirePermissions('projects.manage_stages')
  reorderStages(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(reorderStagesSchema)) dto: ReorderStagesInput,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): Promise<Stage[]> {
    return this.projectsService.reorderStages(tenant.id, user.sub, id, dto);
  }

  // --- Members ---

  @Post(':id/members')
  @RequirePermissions('projects.manage_members')
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(addProjectMemberSchema)) dto: AddProjectMemberInput,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): Promise<ProjectMember> {
    return this.projectsService.addMember(tenant.id, user.sub, id, dto);
  }

  @Delete(':id/members/:userId')
  @RequirePermissions('projects.manage_members')
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ id: string }> {
    return this.projectsService.removeMember(tenant.id, user.sub, id, userId);
  }
}
