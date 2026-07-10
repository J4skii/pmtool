import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { bullConnection } from './redis-connection';

export const QUEUE_NAMES = ['email', 'reports', 'ai', 'webhooks'] as const;
export type QueueName = (typeof QUEUE_NAMES)[number];

export interface EmailJob {
  to: string;
  subject: string;
  html: string;
  tenantId?: string;
}

export interface WebhookJob {
  url: string;
  secret: string;
  event: string;
  payload: unknown;
  tenantId: string;
}

/**
 * BullMQ queue registry. Background workers live in *.processor.ts files;
 * other modules inject this service to enqueue jobs.
 */
@Injectable()
export class QueuesService implements OnModuleDestroy {
  private readonly logger = new Logger(QueuesService.name);
  private readonly queues = new Map<QueueName, Queue>();

  constructor() {
    for (const name of QUEUE_NAMES) {
      this.queues.set(
        name,
        new Queue(name, {
          connection: bullConnection(),
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5_000 },
            removeOnComplete: { count: 1000 },
            removeOnFail: { count: 5000 },
          },
        }),
      );
    }
  }

  async addEmailJob(job: EmailJob): Promise<void> {
    await this.add('email', 'send', job);
  }

  async addWebhookJob(job: WebhookJob): Promise<void> {
    await this.add('webhooks', 'deliver', job);
  }

  async addReportJob(payload: { reportId: string; tenantId: string }): Promise<void> {
    await this.add('reports', 'generate', payload);
  }

  async addAiJob(payload: { feature: string; tenantId: string; input: unknown }): Promise<void> {
    await this.add('ai', 'process', payload);
  }

  private async add(queue: QueueName, name: string, data: unknown): Promise<void> {
    try {
      await this.queues.get(queue)?.add(name, data);
    } catch (err) {
      // Queueing must not break the request path; degraded mode is logged.
      this.logger.error(`Failed to enqueue ${queue}/${name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled([...this.queues.values()].map((q) => q.close()));
  }
}
