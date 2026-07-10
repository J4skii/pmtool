import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppError, ERROR_CODES } from '@flowos/shared';
import OpenAI from 'openai';
import { PRISMA, type Db } from '../../common/prisma.provider';
import type { ChatRequestInput } from './ai.dto';

export interface ChatResult {
  message: string;
  usage: { promptTokens: number; completionTokens: number };
}

/**
 * AI assistant backed by OpenAI, with graceful degradation and per-call
 * usage logging (AiUsageLog) for compliance and cost tracking.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: OpenAI | null;
  private readonly model: string;

  constructor(@Inject(PRISMA) private readonly db: Db) {
    const apiKey = process.env.OPENAI_API_KEY;
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
    this.model = process.env.OPENAI_MODEL ?? 'gpt-4o';
  }

  async chat(tenantId: string, userId: string, input: ChatRequestInput): Promise<ChatResult> {
    if (!this.client) {
      throw new AppError(ERROR_CODES.AI_UNAVAILABLE, 'AI features are not configured for this workspace', 503);
    }

    const systemPrompt = await this.buildSystemPrompt(tenantId, input.projectId);

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'system' as const, content: systemPrompt }, ...input.messages],
        max_tokens: 1500,
        temperature: 0.4,
      });

      const usage = {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
      };
      await this.logUsage(tenantId, userId, 'chat', usage, true);

      return { message: response.choices[0]?.message?.content ?? '', usage };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`OpenAI chat failed: ${message}`);
      await this.logUsage(tenantId, userId, 'chat', { promptTokens: 0, completionTokens: 0 }, false, message);
      throw new AppError(ERROR_CODES.AI_UNAVAILABLE, 'The AI assistant is temporarily unavailable', 503);
    }
  }

  /**
   * Context-aware system prompt: tenant identity plus, when a project is in
   * focus, a live summary (status, task counts, overdue) so answers like
   * "why is this project delayed?" are grounded in real data.
   */
  private async buildSystemPrompt(tenantId: string, projectId?: string): Promise<string> {
    const tenant = await this.db.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
    let prompt =
      `You are the FlowOS project management assistant for the organization "${tenant?.name ?? 'Unknown'}". ` +
      `Be concise, practical, and action-oriented. Never reveal data from other organizations.`;

    if (projectId) {
      const project = await this.db.project.findFirst({
        where: { id: projectId, tenantId, deletedAt: null },
        select: { name: true, status: true, dueDate: true },
      });
      if (project) {
        const [total, open, overdue] = await Promise.all([
          this.db.task.count({ where: { tenantId, projectId, deletedAt: null } }),
          this.db.task.count({ where: { tenantId, projectId, deletedAt: null, completedAt: null } }),
          this.db.task.count({
            where: { tenantId, projectId, deletedAt: null, completedAt: null, dueDate: { lt: new Date() } },
          }),
        ]);
        prompt +=
          `\n\nCurrent project context: "${project.name}" (status ${project.status}` +
          `${project.dueDate ? `, due ${project.dueDate.toISOString().slice(0, 10)}` : ''}). ` +
          `Tasks: ${total} total, ${open} open, ${overdue} overdue.`;
      }
    }
    return prompt;
  }

  private async logUsage(
    tenantId: string,
    userId: string,
    feature: string,
    usage: { promptTokens: number; completionTokens: number },
    success: boolean,
    error?: string,
  ): Promise<void> {
    try {
      await this.db.aiUsageLog.create({
        data: {
          tenantId,
          userId,
          feature,
          model: this.model,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          success,
          error,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to write AI usage log: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
