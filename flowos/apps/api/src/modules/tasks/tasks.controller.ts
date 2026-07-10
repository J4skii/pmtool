import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  createDependencySchema,
  createTaskSchema,
  updateTaskSchema,
  type CreateDependencyInput,
  type CreateTaskInput,
  type UpdateTaskInput,
} from '@flowos/shared';
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
  bulkUpdateTasksSchema,
  listTasksQuerySchema,
  moveTaskSchema,
  type BulkUpdateTasksInput,
  type ListTasksQuery,
  type MoveTaskInput,
} from './tasks.dto';
import { TasksService } from './tasks.service';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('projects/:projectId/tasks')
  @RequirePermissions('tasks.read')
  listByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query(new ZodValidationPipe(listTasksQuerySchema)) query: ListTasksQuery,
    @CurrentTenant() tenant: Tenant,
  ): ReturnType<TasksService['listByProject']> {
    return this.tasksService.listByProject(tenant.id, projectId, query);
  }

  @Get('projects/:projectId/critical-path')
  @RequirePermissions('tasks.read')
  criticalPath(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentTenant() tenant: Tenant,
  ): ReturnType<TasksService['criticalPath']> {
    return this.tasksService.criticalPath(tenant.id, projectId);
  }

  @Get('tasks/:id')
  @RequirePermissions('tasks.read')
  getById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: Tenant,
  ): ReturnType<TasksService['getById']> {
    return this.tasksService.getById(tenant.id, id);
  }

  @Post('tasks')
  @RequirePermissions('tasks.create')
  create(
    @Body(new ZodValidationPipe(createTaskSchema)) dto: CreateTaskInput,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<TasksService['create']> {
    return this.tasksService.create(tenant.id, user.sub, dto);
  }

  @Patch('tasks/bulk')
  @RequirePermissions('tasks.bulk_edit')
  bulkUpdate(
    @Body(new ZodValidationPipe(bulkUpdateTasksSchema)) dto: BulkUpdateTasksInput,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<TasksService['bulkUpdate']> {
    return this.tasksService.bulkUpdate(tenant.id, user.sub, dto);
  }

  @Patch('tasks/:id')
  @RequirePermissions('tasks.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateTaskSchema)) dto: UpdateTaskInput,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<TasksService['update']> {
    return this.tasksService.update(tenant.id, user.sub, id, dto);
  }

  @Post('tasks/:id/move')
  @RequirePermissions('tasks.move')
  move(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(moveTaskSchema)) dto: MoveTaskInput,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<TasksService['move']> {
    return this.tasksService.move(tenant.id, user.sub, id, dto);
  }

  @Delete('tasks/:id')
  @RequirePermissions('tasks.delete')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<TasksService['softDelete']> {
    return this.tasksService.softDelete(tenant.id, user.sub, id);
  }

  @Post('dependencies')
  @RequirePermissions('tasks.manage_dependencies')
  addDependency(
    @Body(new ZodValidationPipe(createDependencySchema)) dto: CreateDependencyInput,
    @CurrentTenant() tenant: Tenant,
  ): ReturnType<TasksService['addDependency']> {
    return this.tasksService.addDependency(tenant.id, dto);
  }

  @Delete('dependencies/:id')
  @RequirePermissions('tasks.manage_dependencies')
  removeDependency(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: Tenant,
  ): ReturnType<TasksService['removeDependency']> {
    return this.tasksService.removeDependency(tenant.id, id);
  }
}
