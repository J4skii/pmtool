import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { AppError, ERROR_CODES } from '@flowos/shared';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload } from '../types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /** passport-jwt has already verified signature + expiry; sanity-check shape. */
  validate(payload: unknown): JwtPayload {
    const p = payload as Partial<JwtPayload>;
    if (
      typeof p.sub !== 'string' ||
      typeof p.email !== 'string' ||
      typeof p.tenantId !== 'string' ||
      typeof p.roleId !== 'string' ||
      !Array.isArray(p.permissions)
    ) {
      throw new AppError(ERROR_CODES.AUTH_TOKEN_INVALID, 'Malformed access token', 401);
    }
    return {
      sub: p.sub,
      email: p.email,
      tenantId: p.tenantId,
      roleId: p.roleId,
      permissions: p.permissions.filter((x): x is string => typeof x === 'string'),
    };
  }
}
