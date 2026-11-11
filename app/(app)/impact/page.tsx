import prisma, { withRetry } from '@/lib/prisma';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge, SeverityBadge } from '@/components/ui/Badge';
import { StackedSeverityBar } from '@/components/ui/HeatBar';
import { EmptyState } from '@/components/ui/EmptyState';
import SourceChip from '@/components/ui/SourceChip';
import Link from 'next/link';
import { TrendingDown } from 'lucide-react';

export const dynamic = 'force-dynamic';

/** "Proven impact" — summary of the latest audit state, screenshot-friendly. */
export default async function ImpactPage() {
  const state = 'Rajasthan';
  const { districts, snapshots, flags, lastSync, lastScore, latestYear } = await withRetry(async () => {
    const districts = await prisma.district.findMany({ where: { state } });
    const districtIds = districts.map((d) => d.id);

    const latestYearRow = await prisma.snapshot.findFirst({ orderBy: [{ year: 'desc' }, { fetchedAt: 'desc' }] });
    const latestYear = latestYearRow?.year ?? new Date().getFullYear();
    const snapshots = await prisma.snapshot.findMany({ where: { districtId: { in: districtIds }, year: latestYear } });
    const flags = await prisma.flag.findMany({
      where: { districtId: { in: districtIds } },
      orderBy: [{ severity: 'desc' }, { score: 'desc' }],
    });

    const lastSync = await prisma.auditLog.findFirst({
      where: { action: 'ingest_sync' },
      orderBy: { createdAt: 'desc' },
    });
    const lastScore = await prisma.auditLog.findFirst({
      where: { action: 'anomaly_score' },
      orderBy: { createdAt: 'desc' },
    });
    return { districts, snapshots, flags, lastSync, lastScore, latestYear };
  });
  const fyLabel = `FY ${latestYear - 1}-${String(latestYear % 100).padStart(2, '0')}`;

  const villagesZero = snapshots.reduce((s, x) => s + x.zeroFhtcVillages, 0);
  const villagesFull = snapshots.reduce((s, x) => s + x.fullFhtcVillages, 0);
  const flaggedDistrictIds = new Set(flags.map((f) => f.districtId));
  const regressions = flags.filter((f) => f.type === 'yoy_regression').length;

  const bySeverity = [5, 4, 3, 2, 1].map((sev) => ({
    severity: sev,
    count: flags.filter((f) => f.severity === sev).length,
  }));

  const districtNameById = new Map(districts.map((d) => [d.id, { name: d.name, id: d.id }]));

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Impact' }]}
        title={`Proven impact — ${state}`}
        meta={
          <>
            <SourceChip
              source={`Live: ejalshakti J8 (${fyLabel})`}
              lastSync={lastSync?.createdAt ?? null}
              fallback={!lastSync}
            />
            <SourceChip source="Scoring run" lastSync={lastScore?.createdAt ?? null} />
          </>
        }
      />

      {/* Hero summary sentence */}
      <p className="mb-6 max-w-3xl text-base leading-relaxed text-ink-secondary">
        <strong className="font-semibold text-ink">{snapshots.length || districts.length} districts audited,</strong>{' '}
        <strong className="font-semibold text-ink">{flaggedDistrictIds.size} flagged,</strong> and{' '}
        <strong className="font-semibold text-ink">{regressions} year-over-year regressions</strong> detected across{' '}
        <strong className="font-semibold text-ink">{villagesZero.toLocaleString('en-IN')} villages</strong> reported at 0%
        or with no data (FY {latestYear}). Every figure below is computed from stored snapshots — nothing is estimated.
      </p>

      {/* KPI strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard label="Districts audited" value={snapshots.length || districts.length} />
        <StatCard label="Districts flagged" value={flaggedDistrictIds.size} accent={flaggedDistrictIds.size > 0 ? 'sev4' : 'none'} />
        <StatCard label="Villages at 0% / unreported" value={villagesZero} accent={villagesZero > 0 ? 'sev3' : 'none'} context={`FY ${latestYear}`} />
        <StatCard label="Villages at 100% FHTC" value={villagesFull} context={`FY ${latestYear}`} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Flags by severity" description={`${flags.length} inconsistencies found in total.`} />
          <div className="p-4">
            {flags.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-secondary">No flags yet. Run a sync and scoring.</p>
            ) : (
              <>
                <StackedSeverityBar counts={bySeverity} />
                <ul className="mt-4 space-y-2">
                  {bySeverity
                    .filter((b) => b.count > 0)
                    .map((b) => (
                      <li key={b.severity} className="flex items-center justify-between gap-3 text-sm">
                        <SeverityBadge severity={b.severity} />
                        <span className="flex-1 border-b border-dotted border-border-strong" aria-hidden="true" />
                        <span className="font-semibold tabular-nums text-ink">{b.count}</span>
                      </li>
                    ))}
                </ul>
              </>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Regressions & top flagged districts" description="Highest-severity flags first." />
          <div className="p-4">
            <div className="mb-3 flex items-center gap-2">
              {regressions === 0 ? (
                <Badge tone="sev1">No YoY regressions on record</Badge>
              ) : (
                <Badge tone="sev5">
                  <TrendingDown className="h-3 w-3" aria-hidden="true" />
                  {regressions} district{regressions === 1 ? '' : 's'} declined year-over-year
                </Badge>
              )}
            </div>
            <ul className="divide-y divide-border">
              {flags.slice(0, 10).map((f) => {
                const d = districtNameById.get(f.districtId);
                return (
                  <li key={f.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0 truncate">
                      {d ? (
                        <Link href={`/district/${d.id}`} className="font-medium text-ink transition-colors hover:text-brand">
                          {d.name}
                        </Link>
                      ) : (
                        '—'
                      )}{' '}
                      <code className="font-mono text-xs text-ink-muted">{f.type}</code>
                    </span>
                    <Badge tone={`sev${Math.min(5, f.severity)}` as 'sev1' | 'sev2' | 'sev3' | 'sev4' | 'sev5'}>
                      S{f.severity} · score {f.score}
                    </Badge>
                  </li>
                );
              })}
              {flags.length === 0 && <li className="py-4 text-sm text-ink-secondary">Nothing flagged yet.</li>}
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
