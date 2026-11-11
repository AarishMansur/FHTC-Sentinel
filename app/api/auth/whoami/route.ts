import { NextResponse } from 'next/server';
import { getTokenFromCookie } from '../../../../lib/requireAuth';
import { getUserFromToken } from '../../../../lib/auth';

export async function GET(req: Request) {
  const token = await getTokenFromCookie(req);
  if (!token) return NextResponse.json({ ok: false });
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ ok: false });
  const { id, email, name, role, state, district } = user;
  return NextResponse.json({ ok: true, user: { id, email, name, role, state, district } });
}
