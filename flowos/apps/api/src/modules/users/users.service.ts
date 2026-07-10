import { Inject, Injectable } from '@nestjs/common';
import { AppError, ERROR_CODES, type Paginated, type PaginationInput } from '@flowos/shared';
import type { Membership, Prisma } from '@flowos/database';
import { PRISMA, type Db } from '../../common/prisma.provider';
import { AuditService } from '../../common/services/audit.service';
import type { InviteUserInput, UpdateMembershipInput } from './users.dto';

type MemberRow = Prisma.MembershipGetPayload<{
  include: { user: { select: { id: true; email: true; firstName: true; lastName: true; avatarUrl: true; status: true; skills: true } }; role: { select: { id: true; name: true } } };
}>;

@Injectable()
export class UsersService {
  constructor(
    @Inject(PRISMA) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string, query: PaginationInput): Promise<Paginated<MemberRow>> {
    const where: Prisma.MembershipWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.search
        ? {
            user: {
              OR: [
                { email: { contains: query.search, mode: 'insensitive' } },
                { firstName: { contains: query.search, mode: 'insensitive' } },
                { lastName: { contains: query.search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };

    const [items, total] = await this.db.$transaction([
      this.db.membership.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true, status: true, skills: true } },
          role: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: query.sortDir },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.db.membership.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  /**
   * Invite a member: creates (or reuses) the global User in INVITED status
   * and a Membership on this tenant.
   * TODO: enqueue an invitation email on the "email" queue with a signed
   * acceptance link once the invite-acceptance flow lands.
   */
  async invite(tenantId: string, actorId: string, input: InviteUserInput): Promise<Membership> {
    const role = await this.db.role.findFirst({ where: { id: input.roleId, tenantId, deletedAt: null } });
    if (!role) throw new AppError(ERROR_CODES.NOT_FOUND, 'Role not found', 404);

    const membership = await this.db.$transaction(async (tx) => {
      let user = await tx.user.findUnique({ where: { email: input.email.toLowerCase() } });
      if (!user) {
        user = await tx.user.create({
          data: {
            email: input.email.toLowerCase(),
            firstName: input.firstName,
            lastName: input.lastName,
            status: 'INVITED',
          },
        });
      }

      const existing = await tx.membership.findFirst({ where: { tenantId, userId: user.id, deletedAt: null } });
      if (existing) throw new AppError(ERROR_CODES.CONFLICT, 'User is already a member of this workspace', 409);

      return tx.membership.create({
        data: {
          tenantId,
          userId: user.id,
          roleId: input.roleId,
          department: input.department ?? null,
          jobTitle: input.jobTitle ?? null,
        },
        include: { user: true, role: true },
      });
    });

    this.audit.writeAudit({ tenantId, userId: actorId, action: 'team.invited', entityType: 'membership', entityId: membership.id, metadata: { email: input.email } });
    return membership;
  }

  async updateMembership(tenantId: string, actorId: string, membershipId: string, input: UpdateMembershipInput): Promise<Membership> {
    const membership = await this.requireMembership(tenantId, membershipId);
    if (input.roleId) {
      const role = await this.db.role.findFirst({ where: { id: input.roleId, tenantId, deletedAt: null } });
      if (!role) throw new AppError(ERROR_CODES.NOT_FOUND, 'Role not found', 404);
    }
    const updated = await this.db.membership.update({ where: { id: membership.id }, data: input });
    this.audit.writeAudit({ tenantId, userId: actorId, action: 'team.membership_updated', entityType: 'membership', entityId: membershipId, metadata: { fields: Object.keys(input) } });
    return updated;
  }

  /** Soft-deactivate: revokes the membership; the global User is untouched. */
  async deactivate(tenantId: string, actorId: string, membershipId: string): Promise<{ id: string }> {
    const membership = await this.requireMembership(tenantId, membershipId);
    await this.db.membership.update({ where: { id: membership.id }, data: { deletedAt: new Date() } });
    this.audit.writeAudit({ tenantId, userId: actorId, action: 'team.deactivated', entityType: 'membership', entityId: membershipId });
    return { id: membershipId };
  }

  private async requireMembership(tenantId: string, membershipId: string): Promise<Membership> {
    const membership = await this.db.membership.findFirst({ where: { id: membershipId, tenantId, deletedAt: null } });
    if (!membership) throw new AppError(ERROR_CODES.NOT_FOUND, 'Member not found', 404);
    return membership;
  }
}
