import type { Provider } from '@nestjs/common';
import { PrismaClient, prisma } from '@flowos/database';

/** Injection token for the shared PrismaClient singleton. */
export const PRISMA = 'PRISMA_CLIENT';

/** Alias so services can type their injected client without `any`. */
export type Db = PrismaClient;

export const prismaProvider: Provider = {
  provide: PRISMA,
  useValue: prisma,
};
