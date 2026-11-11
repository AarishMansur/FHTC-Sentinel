import Link from 'next/link';
import { cookies } from 'next/headers';
import { ArrowRight, Printer, ClipboardList, AlertTriangle } from 'lucide-react';
import prisma, { withRetry } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge, SeverityBadge, severityLabelWord } from '@/components/ui/Badge';
import { HeatBar } from '@/components/ui/HeatBar';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { EmptyState } from '@/components/ui/EmptyState';
import SourceChip from '@/components/ui/SourceChip';
import { Button } from '@/components/ui/Button';
import { FIELD_CHECKS_EN, FIELD_CHECKS_HI } from '@/components/ui/fieldChecks';
import { BucketChart, type BucketDatum } from './BucketChart';
import { BriefingPreview } from './BriefingPreview';

export const dynamic = 'force-dynamic';

export default async function DistrictPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const district = await withRetry(() =>
    prisma.district.findUnique({
      where: { id },
      include: {
        snapshots: { orderBy: { year: 'asc' } },
        flags: { orderBy: [{ severity: 'desc' }, { score: 'desc' }] },
      },
    })
  );
  if (!district) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-8 w-8" aria-hidden="true" />}
        title="District not found"
        description="The link may be stale. Open the dashboard for the current district list."
        action={
          <Link href="/dashboard" className="text-sm font-medium text-brand hover:text-brand-hover">
            Go to dashboard →
          </Link>
        }
      />
    );
  }

  const maxFlag = district.flags.reduce((max, f) => Math.max(max, f.score), 0);
  const maxSeverity = district.flags.reduce((max, f) => Math.max(max, f.severity), 0);
  const latest = district.snapshots[district.snapshots.length - 1];
  const notCertified =
    latest && latest.totalVillages > 0
      ? Math.max(0, latest.totalVillages - latest.fullFhtcVillages - latest.zeroFhtcVillages)
      : 0;
  const risk = Math.min(100, maxFlag);

  const chartData: BucketDatum[] = district.snapshots.map((s) => {
    const t = s.totalVillages > 0 ? s.totalVillages : 1;
    return {
      year: s.year,
      full: (s.fullFhtcVillages / t) * 100,
      zero: (s.zeroFhtcVillages / t) * 100,
      partial: Math.max(0, 100 - (s.fullFhtcVillages / t) * 100 - (s.zeroFhtcVillages / t) * 100),
    };
  });

  const briefingRows = await prisma.briefing.findMany({
    where: { districtId: district.id },
    select: { language: true, content: true },
  });
  const enBriefing = briefingRows.find((b) => b.language === 'en')?.content ?? null;
  const hiBriefing = briefingRows.find((b) => b.language === 'hi')?.content ?? null;

  // Viewer scope chip (read-only: the session token is verified via lib/auth).
  const cookieStore = await cookies();
  let scopeLabel = 'Public view';
  try {
    const token = cookieStore.get('token')?.value ?? null;
    const user = token ? await getUserFromToken(token) : null;
    if (user) {
      scopeLabel = user.state && !user.district ? 'Whole state' : `${user.district ?? ''} only`.trim();
    }
  } catch {
    /* token verification failure keeps the neutral label */
  }

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Districts' },
          { label: district.name },
        ]}
        title={
          <>
            {district.name}{' '}
            <code className="ml-1 align-middle font-mono text-sm font-normal text-ink-muted">{district.code}</code>
          </>
        }
        meta={
          <>
            <SeverityBadge severity={maxSeverity} />
            <Badge tone="brand">{scopeLabel}</Badge>
            {risk > 0 && <Badge tone={risk >= 80 ? 'sev5' : risk >= 50 ? 'sev4' : 'sev3'}>Risk {risk}/100</Badge>}
            <SourceChip source="Live: ejalshakti J8" />
          </>
        }
        action={
          <>
            <Link
              href={`/district/${district.id}/briefing/print`}
              className="inline-flex h-11 items-center gap-2 rounded-input border border-border bg-surface px-3.5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-subtle md:h-9"
            >
              <Printer className="h-4 w-4 text-ink-secondary" aria-hidden="true" />
              Print view
            </Link>
            <Link
              href={`/district/${district.id}/briefing`}
              className="inline-flex h-11 items-center gap-2 rounded-input bg-brand px-3.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-hover md:h-9"
            >
              Generate briefing
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        {/* Left: chart + flags */}
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader
              title="Coverage buckets across years"
              description="Share of villages by reported FY bucket (100% FHTC, intermediate, 0%)."
            />
            <div className="p-4">
              {chartData.length > 0 ? (
                <BucketChart data={chartData} />
              ) : (
                <p className="py-8 text-center text-sm text-ink-secondary">
                  No snapshots. Run a sync.
                </p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title={`Flags${district.flags.length > 0 ? ` (${district.flags.length})` : ''}`}
              description={district.flags.length > 0 ? `Highest flag score ${maxFlag} of 100.` : undefined}
            />
            <div className="space-y-3 p-4">
              {district.flags.length === 0 && (
                <EmptyState
                  icon={<ClipboardList className="h-8 w-8" aria-hidden="true" />}
                  title="No flags raised"
                  description="The latest scoring run found no inconsistencies for this district."
                />
              )}
              {district.flags.map((f) => (
                <div key={f.id} className="print-avoid-break rounded-card border border-border bg-surface p-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={f.severity} />
                    <code className="font-mono text-[13px] font-medium text-ink">{f.type}</code>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">{f.explanation}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <HeatBar value={f.score} showTicks={false} />
                    <span className="text-xs text-ink-muted">score {f.score} · {severityLabelWord(f.severity)}</span>
                  </div>
                  <details className="group mt-2.5">
                    <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-input text-xs font-medium text-ink-secondary marker:hidden transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
                      Evidence
                      <ChevronSmall />
                    </summary>
                    <CodeBlock
                      className="mt-2"
                      code={JSON.stringify(f.evidence, null, 2)}
                      copyText={JSON.stringify(f.evidence)}
                    />
                  </details>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right: field checks, snapshot summary, briefing preview */}
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader title="Field checks" description="Priority order for field inspection." />
            <ol className="divide-y divide-border">
              {FIELD_CHECKS_EN.map((c, i) => (
                <li key={i} className="flex gap-2.5 px-4 py-3">
                  <span className="mt-0.5 font-mono text-xs font-semibold text-brand">{i + 1}</span>
                  <p className="text-xs leading-relaxed text-ink-secondary">{c}</p>
                </li>
              ))}
            </ol>
            <details className="group border-t border-border">
              <summary className="cursor-pointer list-none px-4 py-2 text-xs font-medium text-ink-muted marker:hidden [&::-webkit-details-marker]:hidden">
                हिन्दी में जांच सूची
              </summary>
              <ol className="divide-y divide-border border-t border-border">
                {FIELD_CHECKS_HI.map((c, i) => (
                  <li key={i} className="flex gap-2.5 px-4 py-3">
                    <span className="mt-0.5 font-mono text-xs font-semibold text-brand">{i + 1}</span>
                    <p className="text-xs leading-relaxed text-ink-secondary">{c}</p>
                  </li>
                ))}
              </ol>
            </details>
          </Card>

          <Card>
            <CardHeader title="Latest snapshot" description={latest ? `FY ${latest.year}` : undefined} />
            {latest ? (
              <dl className="grid grid-cols-2 gap-px bg-border">
                {[
                  ['Total villages', latest.totalVillages.toLocaleString('en-IN')],
                  ['100% FHTC', latest.fullFhtcVillages.toLocaleString('en-IN')],
                  ['0% / unreported', latest.zeroFhtcVillages.toLocaleString('en-IN')],
                  ['Intermediate', notCertified.toLocaleString('en-IN')],
                ].map(([k, v]) => (
                  <div key={k} className="bg-surface px-4 py-3">
                    <dt className="text-xs text-ink-muted">{k}</dt>
                    <dd className="mt-0.5 text-lg font-semibold tabular-nums text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="px-4 py-6 text-center text-sm text-ink-secondary">No snapshot stored.</p>
            )}
          </Card>

          <Card>
            <BriefingPreview en={enBriefing} hi={hiBriefing} districtId={district.id} />
          </Card>
        </div>
      </div>
    </div>
  );
}

function ChevronSmall() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" className="transition-transform duration-150 group-open:rotate-90" aria-hidden="true">
      <path d="M3.5 1.5 7 5 3.5 8.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
