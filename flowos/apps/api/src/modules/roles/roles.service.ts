import { Inject, Injectable } from '@nestjs/common';
import { AppError, ERROR_CODES, PERMISSION_CATALOG, type PermissionEntry } from '@flowos/shared';
import type { Role } from '@flowos/database';
import { PRISMA, type Db } from '../../common/prisma.provider';
import { AuditService } from '../../common/services/audit.service';
import { SUPER_ADMIN_ROLE_NAME } from '../auth/system-roles';
import type { CreateRoleInput, UpdateRoleInput } from './roles.dto';

@Injectable()
export class RolesService {
  constructor(
    @Inject(PRISMA) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  catalog(): readonly PermissionEntry[] {
    return PERMISSION_CATALOG;
  }

  list(tenantId: string): Promise<Role[]> {
    return this.db.role.findMany({ where: { tenantId, deletedAt: null }, orderBy: [{ isSystem: 'desc' }, { name: 'asc' }] });
  }

  async create(tenantId: string, actorId: string, input: CreateRoleInput): Promise<Role> {
    this.assertKnownPermissions(input.permissions);
    const role = await this.db.role.create({
      data: { tenantId, name: input.name, permissions: input.permissions, isSystem: false },
    });
    this.audit.writeAudit({ tenantId, userId: actorId, action: 'team.role_created', entityType: 'role', entityId: role.id });
    return role;
  }

  /**
   * System-role editing rules:
   *  - Super Admin is fully immutable.
   *  - Other system roles: only the permission list may change, not the name.
   *  - Custom roles: anything goes.
   */
  async update(tenantId: string, actorId: string, roleId: string, input: UpdateRoleInput): Promise<Role> {
    const role = await this.requireRole(tenantId, roleId);

    if (role.isSystem) {
      if (role.name === SUPER_ADMIN_ROLE_NAME) {
        throw new AppError(ERROR_CODES.FORBIDDEN, 'The Super Admin role cannot be modified', 403);
      }
      if (input.name !== undefined && input.name !== role.name) {
        throw new AppError(ERROR_CODES.FORBIDDEN, 'System role names cannot be changed', 403);
      }
    }

    if (input.permissions) this.assertKnownPermissions(input.permissions);

    const updated = await this.db.role.update({
      where: { id: role.id },
      data: {
        ...(role.isSystem ? {} : { name: input.name }),
        ...(input.permissions ? { permissions: input.permissions } : {}),
      },
    });
    this.audit.writeAudit({ tenantId, userId: actorId, action: 'team.role_updated', entityType: 'role', entityId: roleId });
    return updated;
  }

  async remove(tenantId: string, actorId: string, roleId: string): Promise<{ id: string }> {
    const role = await this.requireRole(tenantId, roleId);
    if (role.isSystem) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'System roles cannot be deleted', 403);
    }
    const inUse = await this.db.membership.count({ where: { roleId, deletedAt: null } });
    if (inUse > 0) {
      throw new AppError(ERROR_CODES.CONFLICT, 'Role is assigned to members and cannot be deleted', 409, { members: inUse });
    }
    await this.db.role.update({ where: { id: roleId }, data: { deletedAt: new Date() } });
    this.audit.writeAudit({ tenantId, userId: actorId, action: 'team.role_deleted', entityType: 'role', entityId: roleId });
    return { id: roleId };
  }

  /** Validate permission keys against the catalog (wildcards allowed). */
  private assertKnownPermissions(keys: string[]): void {
    const known = new Set(PERMISSION_CATALOG.map((p) => p.key));
    const modules = new Set(PERMISSION_CATALOG.map((p) => p.module as string));
    const invalid = keys.filter((key) => {
      if (key === '*') return false;
      if (key.endsWith('.*')) return !modules.has(key.slice(0, -2));
      return !known.has(key);
    });
    if (invalid.length > 0) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, 'Unknown permission keys', 422, { invalid });
    }
  }

  private async requireRole(tenantId: string, roleId: string): Promise<Role> {
    const role = await this.db.role.findFirst({ where: { id: roleId, tenantId, deletedAt: null } });
    if (!role) throw new AppError(ERROR_CODES.NOT_FOUND, 'Role not found', 404);
    return role;
  }
}
