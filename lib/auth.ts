import prisma, { withRetry } from '@/lib/prisma';
import { SignJWT, jwtVerify } from 'jose';

const JWT_EXP = '8h';

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 20) {
    throw new Error('jwt_secret_missing');
  }
  return new TextEncoder().encode(secret);
}

export async function createTokenForUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('user_not_found');

  return new SignJWT({ sub: user.id, role: user.role, email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXP)
    .sign(getJwtSecret());
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload;
  } catch {
    return null;
  }
}

export async function getUserFromToken(token: string) {
  const payload = await verifyToken(token);
  if (!payload || !payload.sub) return null;
  return withRetry(() => prisma.user.findUnique({ where: { id: String(payload.sub) } }));
}
