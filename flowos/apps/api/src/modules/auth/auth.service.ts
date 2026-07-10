import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  AppError,
  ERROR_CODES,
  INDUSTRY_TERMINOLOGY,
  type LoginInput,
  type RegisterInput,
} from '@flowos/shared';
import type { Membership, Role, Tenant, User } from '@flowos/database';
import * as bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import { PRISMA, type Db } from '../../common/prisma.provider';
import { AuditService } from '../../common/services/audit.service';
import type { JwtPayload } from '../../common/types';
import { SUPER_ADMIN_ROLE_NAME, SYSTEM_ROLES } from './system-roles';

const BCRYPT_COST = 12;
const REFRESH_TOKEN_BYTES = 64;

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends AuthTokens {
  user: Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'avatarUrl' | 'totpEnabled'>;
  tenant: Pick<Tenant, 'id' | 'slug' | 'name' | 'plan'>;
}

type MembershipWithRole = Membership & { role: Role; tenant: Tenant };

@Injectable()
export class AuthService {
  constructor(
    @Inject(PRISMA) private readonly db: Db,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  // ------------------------------------------------------------------
  // Registration: Tenant + Organization + system Roles + User + Membership
  // in a single transaction.
  // ------------------------------------------------------------------
  async register(input: RegisterInput, meta: RequestMeta): Promise<AuthResult> {
    const [slugTaken, emailTaken] = await Promise.all([
      this.db.tenant.findUnique({ where: { slug: input.tenantSlug }, select: { id: true } }),
      this.db.user.findUnique({ where: { email: input.email.toLowerCase() }, select: { id: true } }),
    ]);
    if (slugTaken) throw new AppError(ERROR_CODES.CONFLICT, 'Workspace URL is already taken', 409);
    if (emailTaken) throw new AppError(ERROR_CODES.CONFLICT, 'An account with this email already exists', 409);

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
    const terminology = INDUSTRY_TERMINOLOGY[input.industry] ?? {};

    const { user, tenant, membership } = await this.db.$transaction(async (tx) => {
      const createdTenant = await tx.tenant.create({
        data: { slug: input.tenantSlug, name: input.tenantName },
      });

      await tx.organization.create({
        data: {
          tenantId: createdTenant.id,
          legalName: input.tenantName,
          industry: input.industry,
          branding: { terminology } as object,
        },
      });

      // Seed the seven system roles for this tenant.
      const roles = await Promise.all(
        SYSTEM_ROLES.map((seed) =>
          tx.role.create({
            data: {
              tenantId: createdTenant.id,
              name: seed.name,
              isSystem: true,
              permissions: seed.permissions,
            },
          }),
        ),
      );
      const superAdmin = roles.find((r) => r.name === SUPER_ADMIN_ROLE_NAME);
      if (!superAdmin) throw new AppError(ERROR_CODES.INTERNAL, 'Role seeding failed', 500);

      const createdUser = await tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          status: 'ACTIVE',
        },
      });

      const createdMembership = await tx.membership.create({
        data: { tenantId: createdTenant.id, userId: createdUser.id, roleId: superAdmin.id },
        include: { role: true, tenant: true },
      });

      return { user: createdUser, tenant: createdTenant, membership: createdMembership };
    });

    this.audit.writeAudit({
      tenantId: tenant.id,
      userId: user.id,
      action: 'auth.register',
      ip: meta.ip,
      userAgent: meta.userAgent,
      metadata: { tenantSlug: tenant.slug },
    });

    return this.buildAuthResult(user, membership, meta);
  }

  // ------------------------------------------------------------------
  // Login with bcrypt verification + optional TOTP second factor.
  // ------------------------------------------------------------------
  async login(input: LoginInput, meta: RequestMeta): Promise<AuthResult> {
    const user = await this.db.user.findFirst({
      where: { email: input.email.toLowerCase(), deletedAt: null },
    });

    if (!user?.passwordHash || !(await bcrypt.compare(input.password, user.passwordHash))) {
      this.audit.writeAudit({
        action: 'auth.login_failed',
        ip: meta.ip,
        userAgent: meta.userAgent,
        metadata: { email: input.email },
      });
      throw new AppError(ERROR_CODES.AUTH_INVALID_CREDENTIALS, 'Invalid email or password', 401);
    }

    if (user.status === 'SUSPENDED' || user.status === 'DEACTIVATED') {
      throw new AppError(ERROR_CODES.AUTH_ACCOUNT_SUSPENDED, 'This account is suspended', 403);
    }

    // Second factor
    if (user.totpEnabled) {
      if (!input.totpCode) {
        throw new AppError(ERROR_CODES.AUTH_2FA_REQUIRED, 'Two-factor code required', 401);
      }
      if (!user.totpSecret || !authenticator.verify({ token: input.totpCode, secret: user.totpSecret })) {
        throw new AppError(ERROR_CODES.AUTH_2FA_INVALID, 'Invalid two-factor code', 401);
      }
    }

    const membership = await this.resolveMembership(user.id, input.tenantSlug);

    await this.db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    this.audit.writeAudit({
      tenantId: membership.tenantId,
      userId: user.id,
      action: 'auth.login',
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return this.buildAuthResult(user, membership, meta);
  }

  // ------------------------------------------------------------------
  // Refresh token rotation: verify → revoke old → issue new pair.
  // ------------------------------------------------------------------
  async refresh(rawToken: string, meta: RequestMeta): Promise<AuthResult> {
    const tokenHash = this.hashToken(rawToken);
    const stored = await this.db.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt) {
      throw new AppError(ERROR_CODES.AUTH_TOKEN_INVALID, 'Refresh token is invalid or revoked', 401);
    }
    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new AppError(ERROR_CODES.AUTH_TOKEN_EXPIRED, 'Refresh token has expired', 401);
    }

    await this.db.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });

    const membership = await this.resolveMembership(stored.userId, undefined);
    return this.buildAuthResult(stored.user, membership, meta);
  }

  async logout(userId: string, rawToken: string | undefined, meta: RequestMeta): Promise<void> {
    if (rawToken) {
      await this.db.refreshToken.updateMany({
        where: { tokenHash: this.hashToken(rawToken), userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    this.audit.writeAudit({ userId, action: 'auth.logout', ip: meta.ip, userAgent: meta.userAgent });
  }

  // ------------------------------------------------------------------
  // TOTP two-factor
  // ------------------------------------------------------------------
  async setup2fa(userId: string): Promise<{ secret: string; otpauthUrl: string }> {
    const user = await this.requireUser(userId);
    const secret = authenticator.generateSecret();
    await this.db.user.update({ where: { id: userId }, data: { totpSecret: secret, totpEnabled: false } });
    return { secret, otpauthUrl: authenticator.keyuri(user.email, 'FlowOS', secret) };
  }

  async enable2fa(userId: string, code: string): Promise<{ enabled: boolean }> {
    const user = await this.requireUser(userId);
    if (!user.totpSecret || !authenticator.verify({ token: code, secret: user.totpSecret })) {
      throw new AppError(ERROR_CODES.AUTH_2FA_INVALID, 'Invalid two-factor code', 401);
    }
    await this.db.user.update({ where: { id: userId }, data: { totpEnabled: true } });
    return { enabled: true };
  }

  // ------------------------------------------------------------------
  // Current identity
  // ------------------------------------------------------------------
  async me(payload: JwtPayload): Promise<Record<string, unknown>> {
    const user = await this.db.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      select: {
        id: true, email: true, firstName: true, lastName: true, avatarUrl: true,
        status: true, totpEnabled: true, preferences: true, skills: true, lastLoginAt: true,
      },
    });
    if (!user) throw new AppError(ERROR_CODES.NOT_FOUND, 'User not found', 404);

    const membership = await this.db.membership.findFirst({
      where: { userId: payload.sub, tenantId: payload.tenantId, deletedAt: null },
      include: { role: true, tenant: { include: { organization: true } } },
    });
    if (!membership) throw new AppError(ERROR_CODES.TENANT_NOT_FOUND, 'Membership not found', 404);

    return { user, membership };
  }

  // ------------------------------------------------------------------
  // Internals
  // ------------------------------------------------------------------
  private async resolveMembership(userId: string, tenantSlug: string | undefined): Promise<MembershipWithRole> {
    const membership = await this.db.membership.findFirst({
      where: {
        userId,
        deletedAt: null,
        tenant: { deletedAt: null, isActive: true, ...(tenantSlug ? { slug: tenantSlug } : {}) },
      },
      include: { role: true, tenant: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!membership) {
      throw new AppError(ERROR_CODES.TENANT_NOT_FOUND, 'No active workspace for this account', 404);
    }
    return membership;
  }

  private async buildAuthResult(user: User, membership: MembershipWithRole, meta: RequestMeta): Promise<AuthResult> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: membership.tenantId,
      roleId: membership.roleId,
      permissions: membership.role.permissions,
    };

    const accessToken = await this.jwtService.signAsync({ ...payload }, {
      secret: this.config.get<string>('JWT_SECRET') ?? '',
      expiresIn: this.config.get<string>('JWT_ACCESS_TTL') ?? '15m',
    });

    // Opaque refresh token: 64 random bytes hex; only its SHA-256 is stored.
    const refreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    await this.db.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        userAgent: meta.userAgent ?? null,
        ip: meta.ip ?? null,
        expiresAt: new Date(Date.now() + parseTtlMs(this.config.get<string>('JWT_REFRESH_TTL') ?? '7d')),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        totpEnabled: user.totpEnabled,
      },
      tenant: {
        id: membership.tenant.id,
        slug: membership.tenant.slug,
        name: membership.tenant.name,
        plan: membership.tenant.plan,
      },
    };
  }

  private async requireUser(userId: string): Promise<User> {
    const user = await this.db.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new AppError(ERROR_CODES.NOT_FOUND, 'User not found', 404);
    return user;
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}

/** Parse "15m" / "12h" / "7d" style TTLs into milliseconds. */
export function parseTtlMs(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl.trim());
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const amount = Number(match[1]);
  const unit = match[2];
  const factor = unit === 's' ? 1000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
  return amount * factor;
}
