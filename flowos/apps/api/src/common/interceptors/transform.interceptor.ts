import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, type Observable } from 'rxjs';

/**
 * Wraps every successful response as { data: ... } and recursively converts
 * BigInt values (Prisma money columns) to strings, since JSON.stringify
 * cannot serialize BigInt.
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler<unknown>): Observable<{ data: unknown }> {
    return next.handle().pipe(map((payload) => ({ data: serializeBigInts(payload) })));
  }
}

export function serializeBigInts(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(serializeBigInts);
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    out[key] = serializeBigInts(entry);
  }
  return out;
}
