import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '../../../../lib/prisma';
import { createTokenForUser } from '../../../../lib/auth';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const schema = z.object({ email: z.string().email(), password: z.string().min(4) });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });

  const token = await createTokenForUser(user.id);

  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', `token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${8 * 60 * 60}`);
  return res;
}
