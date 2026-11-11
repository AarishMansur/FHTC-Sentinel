import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prisma =
  global.prisma || (process.env.DATABASE_URL_POOLED ? new PrismaClient({ datasourceUrl: process.env.DATABASE_URL_POOLED }) : new PrismaClient());

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

/**
 * Retry helper for transient Neon connection drops (P1001) — Neon suspends idle
 * compute and cold starts occasionally refuse the first connections. Pages use
 * this so a hiccup becomes a one-line retry instead of a user-facing error.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { attempts = 3, baseDelayMs = 600 }: { attempts?: number; baseDelayMs?: number } = {}
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      const meta = (e as { code?: string })?.code;
      if (meta !== 'P1001' && meta !== 'P1002') throw e;
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt + Math.floor(Math.random() * 300)));
    }
  }
  throw lastError;
}

export default prisma;
