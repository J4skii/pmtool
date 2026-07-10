import { Injectable, PipeTransform } from '@nestjs/common';
import { AppError, ERROR_CODES } from '@flowos/shared';
import type { ZodTypeAny, z } from 'zod';

/**
 * Generic Zod validation pipe. Used per-parameter:
 *
 *   @Post()
 *   create(@Body(new ZodValidationPipe(createTaskSchema)) dto: CreateTaskInput) {}
 *
 * Throws AppError(VALIDATION_FAILED, 422) carrying zod's flattened issues so
 * the frontend can map field errors directly.
 */
@Injectable()
export class ZodValidationPipe<TSchema extends ZodTypeAny> implements PipeTransform<unknown, z.infer<TSchema>> {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): z.infer<TSchema> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, 'Validation failed', 422, result.error.flatten());
    }
    return result.data as z.infer<TSchema>;
  }
}
