import { Global, Module } from '@nestjs/common';
import { prismaProvider } from './prisma.provider';
import { AuditService } from './services/audit.service';
import { TenantGuard } from './guards/tenant.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { JwtStrategy } from './guards/jwt.strategy';

/**
 * Global module exposing the Prisma singleton, audit trail, guards and the
 * passport JWT strategy to every feature module without repeated imports.
 */
@Global()
@Module({
  providers: [prismaProvider, AuditService, TenantGuard, PermissionsGuard, JwtStrategy],
  exports: [prismaProvider, AuditService, TenantGuard, PermissionsGuard],
})
export class CommonModule {}
