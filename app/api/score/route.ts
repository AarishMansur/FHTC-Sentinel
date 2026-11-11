import { NextResponse } from 'next/server';
import { z } from 'zod';
import { scoreAllDistricts } from '../../../lib/anomalyAgent';
import { requireAuth, authErrorResponse } from '../../../lib/requireAuth';

const bodySchema = z.object({ state: z.string().min(2).max(50) });

export async function POST(req: Request) {
  let user = null;
  try {
    user = await requireAuth(req, ['state_admin', 'collector']);
  } catch (e) {
    const res = authErrorResponse(e);
    if (res) return res;
    throw e;
  }

  const body = await req.json().catch(() => null);
  if (body === null) return NextResponse.json({ error: 'invalid_json' }, { status: 400 });

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', issues: parsed.error.issues }, { status: 400 });

  const state = parsed.data.state;
  if (user && user.state && user.state !== state) {
    return NextResponse.json({ error: 'forbidden_state' }, { status: 403 });
  }

  try {
    const results = await scoreAllDistricts(state);
    return NextResponse.json({ ok: true, results });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'scoring_failed' }, { status: 500 });
  }
}
