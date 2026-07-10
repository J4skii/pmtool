import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AppError, ERROR_CODES } from '@flowos/shared';
import type { JwtPayload } from '../types';

/**
 * Bearer-token guard backed by the passport-jwt strategy.
 * Attaches the verified JwtPayload as request.user.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  override handleRequest<TUser = JwtPayload>(err: unknown, user: TUser | false): TUser {
    if (err instanceof AppError) throw err;
    if (err || !user) {
      throw new AppError(ERROR_CODES.AUTH_TOKEN_INVALID, 'Missing or invalid access token', 401);
    }
    return user;
  }
}
