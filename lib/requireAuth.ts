import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getUserFromToken, verifyToken } from './auth';

export async function getTokenFromCookie(req: Request) {
  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('token='));
  if (!match) return null;
  return match.split('=')[1] || null;
}

export async function requireAuth(req: Request, roles: string[] = []) {
  const token = await getTokenFromCookie(req);
  if (!token) throw new Error('unauthenticated');

  const payload = await verifyToken(token);
  if (!payload || !payload.sub) throw new Error('unauthenticated');

  const user = await getUserFromToken(token);
  if (!user) throw new Error('unauthenticated');

  if (roles.length > 0 && !roles.includes(user.role)) throw new Error('forbidden');

  return user;
}

export function authErrorResponse(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg === 'unauthenticated') {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  if (msg === 'forbidden') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  return null;
}

export function getCronSecret(req: Request) {
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; self-hosted cron
  // setups typically send a custom `x-cron-secret` header. Accept both.
  const bearer = req.headers.get('authorization');
  if (bearer) {
    const m = bearer.match(/^Bearer\s+(.+)$/i);
    if (m) return m[1].trim();
  }
  return req.headers.get('x-cron-secret') || null;
}

export function isCronSecretValid(secretFromHeader: string | null) {
  const expected = process.env.CRON_SECRET;
  if (!expected || !secretFromHeader) return false;
  const a = Buffer.from(secretFromHeader);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
