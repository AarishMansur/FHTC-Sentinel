import prisma, { withRetry } from '@/lib/prisma';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import SourceChip from '@/components/ui/SourceChip';
import { DistrictFilterTable, type DistrictRow } from './DistrictFilterTable';
import { Database } from 'lucide-react';

export const dynamic = 'force-dynamic';

/** When the ingest agent stored Har Ghar Jal bucket stats, extract reported/certified. */
function hgStats(otherBuckets: unknown): { reported: number; certified: number } | null {
  if (!otherBuckets || typeof otherBuckets !== 'object' || Array.isArray(otherBuckets)) return null;
  const o = otherBuckets as Record<string, unknown>;
  if (o.source !== 'har_ghar_jal') return null;
  return {
    reported: Number(o.villagesReported ?? 0),
    certified: Number(o.villagesCertified ?? 0),
  };
}

export default async function DashboardPage() {
  const state = 'Rajasthan';
  const { districts, latestYearRow, snapshots, flags, lastSync } = await withRetry(async () => {
    const districts = await prisma.district.findMany({
      where: { state },
      orderBy: { name: 'asc' },
    });
    const districtIds = districts.map((d) => d.id);
    const latestYearRow = await prisma.snapshot.findFirst({ orderBy: [{ year: 'desc' }, { fetchedAt: 'desc' }] });
    const latestYear = latestYearRow?.year ?? new Date().getFullYear();
    const snapshots = await prisma.snapshot.findMany({
      where: { districtId: { in: districtIds }, year: latestYear },
    });
    const flags = await prisma.flag.findMany({ where: { districtId: { in: districtIds } } });
    const lastSync = await prisma.auditLog.findFirst({
      where: { action: 'ingest_sync' },
      orderBy: { createdAt: 'desc' },
    });
    return { districts, latestYearRow, snapshots, flags, lastSync };
  });
  const latestYear = latestYearRow?.year ?? new Date().getFullYear();
  // Stored year 2027 == reporting FY 2026-27.
  const fyLabel = `FY ${latestYear - 1}-${String(latestYear % 100).padStart(2, '0')}`;

  const snapshotByDistrict = new Map(snapshots.map((s) => [s.districtId, s]));
  const latestFlagsByDistrict = new Map<string, typeof flags[number][]>();
  for (const f of flags) {
    const list = latestFlagsByDistrict.get(f.districtId) || [];
    list.push(f);
    latestFlagsByDistrict.set(f.districtId, list);
  }

  const rows: DistrictRow[] = districts
    .map((d) => {
      const s = snapshotByDistrict.get(d.id);
      const districtFlags = latestFlagsByDistrict.get(d.id) || [];
      const riskScore = districtFlags.reduce((max, f) => Math.max(max, f.score), 0);
      const flaggedEffect = districtFlags.reduce((sum, f) => sum + f.score, 0);
      const risk = Math.min(100, Math.max(riskScore, Math.round((flaggedEffect / 100) * 100)));
      const topFlag =
        [...districtFlags].sort((a, b) => b.severity - a.severity || b.score - a.score)[0]?.type ?? null;
      const hg = hgStats(s?.otherBuckets);
      const notCertified = hg ? Math.max(0, hg.reported - hg.certified) : Math.max(0, (s?.totalVillages ?? 0) - (s?.fullFhtcVillages ?? 0) - (s?.zeroFhtcVillages ?? 0));
      return {
        id: d.id,
        name: d.name,
        code: d.code,
        year: s?.year ?? null,
        totalVillages: s?.totalVillages ?? null,
        zeroFhtcVillages: s?.zeroFhtcVillages ?? null,
        fullFhtcVillages: s?.fullFhtcVillages ?? null,
        notCertified,
        flagCount: districtFlags.length,
        maxSeverity: districtFlags.reduce((max, f) => Math.max(max, f.severity), 0),
        topFlag,
        hasRegression: districtFlags.some((f) => f.type === 'yoy_regression'),
        risk,
      };
    })
    .sort((a, b) => b.risk - a.risk || (b.zeroFhtcVillages || 0) - (a.zeroFhtcVillages || 0));

  const audited = rows.length;
  const flagged = rows.filter((r) => r.flagCount > 0).length;
  const totalZeroVillages = rows.reduce((s, r) => s + (r.zeroFhtcVillages || 0), 0);
  const totalNotCertified = rows.reduce((s, r) => s + r.notCertified, 0);
  const regressions = flags.filter((f) => f.type === 'yoy_regression').length;

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard' }]}
        title={`Dashboard — ${state}`}
        meta={
          <SourceChip
            source={lastSync ? `Live: ejalshakti J8 (${fyLabel})` : undefined}
            lastSync={lastSync?.createdAt ?? null}
            fallback={!lastSync}
          />
        }
      />

      {/* KPI strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
        <StatCard label="Districts scored" value={audited} />
        <StatCard
          label="Districts flagged"
          value={flagged}
          context="with ≥1 data inconsistency"
          accent={flagged > 0 ? 'sev4' : 'none'}
        />
        <StatCard
          label="Villages at 0% / unreported"
          value={totalZeroVillages}
          context={`FY ${latestYear}`}
          accent={totalZeroVillages > 0 ? 'sev3' : 'none'}
        />
        <StatCard
          label="Reported, not certified"
          value={totalNotCertified}
          context="pending certification"
        />
        <StatCard
          label="YoY regressions"
          value={regressions}
          context="flag type: yoy_regression"
          accent={regressions > 0 ? 'sev5' : 'none'}
        />
      </div>

      {/* Ranked table */}
      <Card>
        <CardHeader
          title="Districts ranked by data-inconsistency risk"
          description="Risk blends the highest flag score with total flagged weight (0–100)."
        />
        <div className="p-3 md:p-4">
          <DistrictFilterTable rows={rows} />
          {rows.length === 0 && (
            <EmptyState
              icon={<Database className="h-8 w-8" aria-hidden="true" />}
              title="No districts yet"
              description="Run a sync with a State JJM Cell account to ingest the public JJM district mirror."
            />
          )}
        </div>
      </Card>
    </div>
  );
}
