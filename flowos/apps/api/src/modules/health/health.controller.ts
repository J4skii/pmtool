import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import Redis from 'ioredis';
import { PRISMA, type Db } from '../../common/prisma.provider';

type CheckStatus = 'ok' | 'error';

interface HealthReport {
  status: 'ok' | 'degraded';
  checks: { database: CheckStatus; redis: CheckStatus; storage: CheckStatus };
}

/** Unauthenticated liveness/readiness probe. */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@Inject(PRISMA) private readonly db: Db) {}

  @Get()
  async check(): Promise<HealthReport> {
    const [database, redis, storage] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkStorage(),
    ]);
    const status = database === 'ok' && redis === 'ok' && storage === 'ok' ? 'ok' : 'degraded';
    return { status, checks: { database, redis, storage } };
  }

  private async checkDatabase(): Promise<CheckStatus> {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return 'ok';
    } catch {
      return 'error';
    }
  }

  private async checkRedis(): Promise<CheckStatus> {
    const client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    });
    try {
      await client.connect();
      await client.ping();
      return 'ok';
    } catch {
      return 'error';
    } finally {
      client.disconnect();
    }
  }

  private async checkStorage(): Promise<CheckStatus> {
    try {
      const client = new S3Client({
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION ?? 'us-east-1',
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY ?? '',
          secretAccessKey: process.env.S3_SECRET_KEY ?? '',
        },
      });
      await client.send(new HeadBucketCommand({ Bucket: process.env.S3_BUCKET ?? 'flowos-files' }));
      return 'ok';
    } catch {
      return 'error';
    }
  }
}
