import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ingestState, ingestHarGharJal } from '../../../lib/ingestAgent';
import { requireAuth, authErrorResponse, getCronSecret, isCronSecretValid } from '../../../lib/requireAuth';

const bodySchema = z.object({
  state: z.string().min(2).max(50),
  source: z.enum(['hargharjal', 'esri']).default('hargharjal'),
  finyear: z.string().regex(/^\d{4}-\d{2,4}$/).optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (body === null) return NextResponse.json({ error: 'invalid_json' }, { status: 400 });

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', issues: parsed.error.issues }, { status: 400 });

  const { state, source, finyear } = parsed.data;
  const cronAuthorized = isCronSecretValid(getCronSecret(req));

  if (!cronAuthorized) {
    let user = null;
    try {
      user = await requireAuth(req, ['state_admin']);
    } catch (e) {
      const res = authErrorResponse(e);
      if (res) return res;
      throw e;
    }
    if (user && user.state && user.state !== state) {
      return NextResponse.json({ error: 'forbidden_state' }, { status: 403 });
    }
  }

  try {
    const result = source === 'esri' ? await ingestState(state) : await ingestHarGharJal(state, { finyear });
    if (!result.success) {
      return NextResponse.json({ error: 'sync_failed', result }, { status: 500 });
    }
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'sync_failed' }, { status: 500 });
  }
}

/**
 * Cron entry point. Vercel Cron (and most schedulers) issue GET requests and
 * authenticate with `Authorization: Bearer <CRON_SECRET>` — no cookie is
 * available, so this endpoint is cron-secret-only and never accepts a user
 * session. Source/finyear come from the query string.
 */
export async function GET(req: Request) {
  if (!isCronSecretValid(getCronSecret(req))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const state = url.searchParams.get('state') || process.env.SYNC_STATE || 'Rajasthan';
  const source = url.searchParams.get('source') === 'esri' ? 'esri' : 'hargharjal';
  const finyearParam = url.searchParams.get('finyear');
  const finyear = finyearParam && /^\d{4}-\d{2,4}$/.test(finyearParam) ? finyearParam : undefined;

  try {
    const result = source === 'esri' ? await ingestState(state) : await ingestHarGharJal(state, { finyear });
    if (!result.success) {
      return NextResponse.json({ error: 'sync_failed', result }, { status: 500 });
    }
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'sync_failed' }, { status: 500 });
  }
}
