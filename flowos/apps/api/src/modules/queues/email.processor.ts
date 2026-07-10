import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { Worker } from 'bullmq';
import * as nodemailer from 'nodemailer';
import type { EmailJob } from './queues.service';
import { bullConnection } from './redis-connection';

/**
 * Email worker: consumes the 'email' queue and delivers via SMTP.
 * Retries with exponential backoff are configured on the queue defaults.
 */
@Injectable()
export class EmailProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailProcessor.name);
  private worker: Worker<EmailJob> | null = null;

  onModuleInit(): void {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? 'localhost',
      port: Number(process.env.SMTP_PORT ?? 1025),
      secure: Number(process.env.SMTP_PORT ?? 1025) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? '' }
        : undefined,
    });

    this.worker = new Worker<EmailJob>(
      'email',
      async (job) => {
        await transporter.sendMail({
          from: process.env.SMTP_FROM ?? 'FlowOS <noreply@flowos.local>',
          to: job.data.to,
          subject: job.data.subject,
          html: job.data.html,
        });
        this.logger.log(`Email sent to ${job.data.to} (${job.data.subject})`);
      },
      { connection: bullConnection(), concurrency: 5 },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Email job ${job?.id ?? '?'} failed: ${err.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
