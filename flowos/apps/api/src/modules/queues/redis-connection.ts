import type { ConnectionOptions } from 'bullmq';

/**
 * Parse REDIS_URL into plain BullMQ connection options.
 *
 * A plain options object is used instead of a shared ioredis instance so
 * BullMQ owns its connections (required for blocking worker commands) and to
 * avoid ioredis type-identity clashes between our dependency tree and the
 * copy BullMQ resolves.
 */
export function bullConnection(): ConnectionOptions {
  const url = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    ...(url.password ? { password: url.password } : {}),
    ...(url.pathname && url.pathname !== '/' ? { db: Number(url.pathname.slice(1)) } : {}),
    maxRetriesPerRequest: null,
  };
}
