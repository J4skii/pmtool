import { Body, Controller, Get, HttpCode, Ip, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from '@flowos/shared';
import { z } from 'zod';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthenticatedRequest, JwtPayload } from '../../common/types';
import { AuthService, type AuthResult } from './auth.service';

const refreshSchema = z.object({ refreshToken: z.string().min(32).max(512) });
type RefreshInput = z.infer<typeof refreshSchema>;

const logoutSchema = z.object({ refreshToken: z.string().min(32).max(512).optional() });
type LogoutInput = z.infer<typeof logoutSchema>;

const totpCodeSchema = z.object({ code: z.string().length(6).regex(/^\d+$/) });
type TotpCodeInput = z.infer<typeof totpCodeSchema>;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(
    @Body(new ZodValidationPipe(registerSchema)) dto: RegisterInput,
    @Ip() ip: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<AuthResult> {
    return this.authService.register(dto, { ip, userAgent: req.headers['user-agent'] });
  }

  @Post('login')
  @HttpCode(200)
  login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginInput,
    @Ip() ip: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<AuthResult> {
    return this.authService.login(dto, { ip, userAgent: req.headers['user-agent'] });
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(
    @Body(new ZodValidationPipe(refreshSchema)) dto: RefreshInput,
    @Ip() ip: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<AuthResult> {
    return this.authService.refresh(dto.refreshToken, { ip, userAgent: req.headers['user-agent'] });
  }

  @Post('logout')
  @HttpCode(204)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  logout(
    @Body(new ZodValidationPipe(logoutSchema)) dto: LogoutInput,
    @CurrentUser() user: JwtPayload,
    @Ip() ip: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    return this.authService.logout(user.sub, dto.refreshToken, { ip, userAgent: req.headers['user-agent'] });
  }

  @Post('2fa/setup')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  setup2fa(@CurrentUser() user: JwtPayload): Promise<{ secret: string; otpauthUrl: string }> {
    return this.authService.setup2fa(user.sub);
  }

  @Post('2fa/enable')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  enable2fa(
    @Body(new ZodValidationPipe(totpCodeSchema)) dto: TotpCodeInput,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ enabled: boolean }> {
    return this.authService.enable2fa(user.sub, dto.code);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtPayload): Promise<Record<string, unknown>> {
    return this.authService.me(user);
  }
}
