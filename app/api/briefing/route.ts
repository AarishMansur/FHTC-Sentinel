import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '../../../lib/prisma';
import { generateBriefing } from '../../../lib/briefingAgent';
import { requireAuth, authErrorResponse } from '../../../lib/requireAuth';

const bodySchema = z.object({ districtId: z.string().min(1).max(64) });

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

  const districtId = parsed.data.districtId;

  const district = await prisma.district.findUnique({ where: { id: districtId } });
  if (!district) return NextResponse.json({ error: 'district_not_found' }, { status: 404 });

  if (user && user.role === 'collector') {
    if (user.state !== district.state || user.district !== district.name) {
      return NextResponse.json({ error: 'forbidden_district' }, { status: 403 });
    }
  }

  try {
    const briefing = await generateBriefing(districtId);
    return NextResponse.json({ ok: true, briefing });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'briefing_failed';
    if (msg === 'district_not_found') return NextResponse.json({ error: 'district_not_found' }, { status: 404 });
    if (msg === 'no_snapshot') return NextResponse.json({ error: 'no_snapshot' }, { status: 400 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
