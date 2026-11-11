import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '../../../../lib/prisma';
import { requireAuth, authErrorResponse } from '../../../../lib/requireAuth';

const bodySchema = z.object({ state: z.string().min(2).max(50) });

function esc(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

async function buildCsv(state: string) {
  const districts = await prisma.district.findMany({ where: { state } });
  const flags = await prisma.flag.findMany({
    where: { districtId: { in: districts.map((d) => d.id) } },
    include: { district: true },
    orderBy: [{ severity: 'desc' }, { score: 'desc' }],
  });

  const rows = ['district_code,district_name,type,severity,score,explanation,created_at'];
  for (const f of flags) {
    rows.push(
      [f.district.code, f.district.name, f.type, f.severity, f.score, esc(f.explanation), f.createdAt.toISOString()].join(',')
    );
  }
  return rows.join('\n');
}

export async function GET(req: Request) {
  return handle(req, new URL(req.url).searchParams.get('state'));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  return handle(req, parsed.success ? parsed.data.state : null);
}

async function handle(req: Request, stateRaw: string | null) {
  let user = null;
  try {
    user = await requireAuth(req, ['state_admin', 'collector']);
  } catch (e) {
    const res = authErrorResponse(e);
    if (res) return res;
    throw e;
  }

  const state = (stateRaw || '').trim();
  if (!bodySchema.safeParse({ state }).success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }
  if (user && user.state && user.state !== state) {
    return NextResponse.json({ error: 'forbidden_state' }, { status: 403 });
  }

  const csv = await buildCsv(state);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="flags_${state.replace(/[^a-z0-9_-]/gi, '_')}.csv"`,
    },
  });
}
