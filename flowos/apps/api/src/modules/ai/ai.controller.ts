import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppError, ERROR_CODES } from '@flowos/shared';
import type { Tenant } from '@flowos/database';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { JwtPayload } from '../../common/types';
import { chatRequestSchema, type ChatRequestInput } from './ai.dto';
import { AiService } from './ai.service';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @RequirePermissions('ai.chat')
  chat(
    @Body(new ZodValidationPipe(chatRequestSchema)) dto: ChatRequestInput,
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<AiService['chat']> {
    return this.aiService.chat(tenant.id, user.sub, dto);
  }

  @Post('transcribe')
  @RequirePermissions('ai.transcribe')
  @ApiOperation({
    summary: 'Voice-note transcription (placeholder)',
    description:
      'Planned: accepts multipart audio, forwards to OpenAI Whisper (OPENAI_WHISPER_MODEL), returns transcript. ' +
      'Not yet implemented — returns 503 until wired to the upload pipeline.',
  })
  transcribe(): never {
    // Whisper integration lands with the mobile voice-note feature.
    throw new AppError(ERROR_CODES.SERVICE_UNAVAILABLE, 'Transcription not yet available', 503);
  }
}
