import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from './prisma';

export const SCORING_RULE_VERSION = 'anomaly.v2';
export const HAR_GHAR_JAL_SOURCE = 'har_ghar_jal';

type FlagDraft = {
  districtId: string;
  type: string;
  severity: number;
  score: number;
  explanation: string;
  evidence: Record<string, unknown>;
};

export type ScoreResult = {
  districtId: string;
  districtCode: string;
  districtName: string;
  flagCount: number;
};

type SnapshotView = {
  year: number;
  totalVillages: number;
  zeroFhtcVillages: number;
  fullFhtcVillages: number;
  otherBuckets: Prisma.JsonValue;
};

type HarGharStats = {
  reported: number;
  certified: number;
  finyear: string | undefined;
};

type SnapshotLike = SnapshotView;

function sha256(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function jsonDict(json: Prisma.JsonValue): Record<string, unknown> {
  return json && typeof json === 'object' && !Array.isArray(json) ? (json as Record<string, unknown>) : {};
}

function hgStats(snapshot: SnapshotView): HarGharStats | null {
  const o = jsonDict(snapshot.otherBuckets);
  if (o.source !== HAR_GHAR_JAL_SOURCE) return null;
  return {
    reported: Number(o.villagesReported ?? 0),
    certified: Number(o.villagesCertified ?? 0),
    finyear: typeof o.finyear === 'string' ? o.finyear : undefined,
  };
}

function pct(part: number, total: number) {
  return total > 0 ? (part / total) * 100 : 0;
}

function median(arr: number[]) {
  if (arr.length === 0) return 0;
  const a = arr.slice().sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 === 0 ? (a[mid - 1] + a[mid]) / 2 : a[mid];
}

function mean(arr: number[]) {
  return arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
}

function std(arr: number[]) {
  if (arr.length === 0) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length);
}

function clampScore(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function severityFromScore(score: number) {
  if (score >= 80) return 5;
  if (score >= 60) return 4;
  if (score >= 40) return 3;
  if (score >= 20) return 2;
  return 1;
}

function evaluateHarGharDistrict(
  districtId: string,
  latest: SnapshotLike,
  previous: SnapshotLike[],
  hg: HarGharStats
): FlagDraft[] {
  const flags: FlagDraft[] = [];
  const total = latest.totalVillages;
  const reported = Math.max(0, Math.min(total, hg.reported));
  const certified = Math.max(0, Math.min(reported, hg.certified));
  const finyear = hg.finyear ?? String(latest.year);
  const baseEvidence = { source: HAR_GHAR_JAL_SOURCE, finyear, year: latest.year, ruleVersion: SCORING_RULE_VERSION };

  const unreported = Math.max(0, total - reported);
  const unreportedShare = pct(unreported, total);

  if (unreportedShare >= 20) {
    const score = clampScore(unreportedShare);
    flags.push({
      districtId,
      type: 'unreported_villages',
      severity: unreportedShare >= 50 ? 5 : unreportedShare >= 30 ? 4 : 3,
      score,
      explanation: `Data gap: ${unreported.toLocaleString('en-IN')} of ${total.toLocaleString('en-IN')} villages (${unreportedShare.toFixed(1)}%) have no Har Ghar Jal data reported in FY ${finyear}; their coverage status is unknown`,
      evidence: { ...baseEvidence, villagesTotal: total, villagesReported: reported, villagesUnreported: unreported },
    });
  }

  if (reported > 0) {
    const notCertified = reported - certified;
    const gapShare = pct(notCertified, reported);

    if (gapShare >= 40) {
      const score = clampScore(gapShare);
      flags.push({
        districtId,
        type: 'certification_gap',
        severity: gapShare >= 70 ? 5 : 4,
        score,
        explanation: `Certification gap: ${notCertified.toLocaleString('en-IN')} of ${reported.toLocaleString('en-IN')} villages reported for Har Ghar Jal (${gapShare.toFixed(1)}%) are not yet certified in FY ${finyear}`,
        evidence: { ...baseEvidence, villagesReported: reported, villagesCertified: certified, reportedNotCertified: notCertified },
      });
    }
  }

  const prevWithHg = previous.map((p) => ({ snap: p, hg: hgStats(p) })).filter((x) => x.hg !== null);
  if (prevWithHg.length > 0) {
    const prevSnap = prevWithHg[0].snap;
    const prevHg = prevWithHg[0].hg as HarGharStats;
    const prevReported = Math.max(0, Math.min(prevSnap.totalVillages, prevHg.reported));
    const prevCertified = Math.max(0, Math.min(prevReported, prevHg.certified));
    const prevUnreportedShare = pct(prevSnap.totalVillages - prevReported, prevSnap.totalVillages);
    const prevCertShare = pct(prevCertified, prevSnap.totalVillages);

    const certShare = pct(certified, total);
    if (prevCertShare - certShare >= 5) {
      const drop = prevCertShare - certShare;
      const score = clampScore(drop * 6);
      flags.push({
        districtId,
        type: 'yoy_regression',
        severity: drop >= 10 ? 5 : 3,
        score,
        explanation: `Certification regression: certified village share dropped ${drop.toFixed(1)} points from ${prevSnap.year} (${prevCertShare.toFixed(1)}%) to ${latest.year} (${certShare.toFixed(1)}%)`,
        evidence: { ...baseEvidence, prevYear: prevSnap.year, prevCertShare: Number(prevCertShare.toFixed(2)) },
      });
    }

    if (unreportedShare - prevUnreportedShare >= 5) {
      const rise = unreportedShare - prevUnreportedShare;
      const score = clampScore(rise * 8);
      flags.push({
        districtId,
        type: 'yoy_regression',
        severity: rise >= 10 ? 5 : 3,
        score,
        explanation: `Reporting regression: villages with no Har Ghar Jal data rose ${rise.toFixed(1)} points from ${prevSnap.year} (${prevUnreportedShare.toFixed(1)}%) to ${latest.year} (${unreportedShare.toFixed(1)}%)`,
        evidence: { ...baseEvidence, prevYear: prevSnap.year, prevUnreportedShare: Number(prevUnreportedShare.toFixed(2)) },
      });
    }
  }

  return flags.map((f) => ({ ...f, severity: Math.max(f.severity, severityFromScore(f.score)) }));
}

function evaluateBucketDistrict(
  districtId: string,
  latest: SnapshotLike,
  previous: SnapshotLike[],
  stats: { medianZero: number; stdZero: number }
): FlagDraft[] {
  const flags: FlagDraft[] = [];
  const pZero = pct(latest.zeroFhtcVillages, latest.totalVillages);
  const pFull = pct(latest.fullFhtcVillages, latest.totalVillages);
  const baseEvidence = { year: latest.year, totalVillages: latest.totalVillages, ruleVersion: SCORING_RULE_VERSION };

  if (pZero >= 10) {
    const score = clampScore(pZero);
    flags.push({
      districtId,
      type: 'high_zero_fhtc',
      severity: pZero >= 20 ? 5 : 3,
      score,
      explanation: `High share of villages with 0% FHTC: ${pZero.toFixed(1)}% (${latest.zeroFhtcVillages} of ${latest.totalVillages} villages in ${latest.year})`,
      evidence: { ...baseEvidence, percentZero: Number(pZero.toFixed(2)) },
    });
  }

  if (pFull >= 85 && pZero >= 3) {
    const score = clampScore(pFull - pZero * 2);
    flags.push({
      districtId,
      type: 'tension',
      severity: Math.max(4, severityFromScore(score)),
      score,
      explanation: `Tension: ${pFull.toFixed(1)}% villages reported at 100% FHTC while ${pZero.toFixed(1)}% report 0% FHTC in ${latest.year}; one of the two figures is likely wrong`,
      evidence: { ...baseEvidence, percentFull: Number(pFull.toFixed(2)), percentZero: Number(pZero.toFixed(2)) },
    });
  }

  if (previous.length > 0) {
    for (const prev of previous) {
      const prevFullPct = pct(prev.fullFhtcVillages, prev.totalVillages);
      const prevZeroPct = pct(prev.zeroFhtcVillages, prev.totalVillages);

      if (prevFullPct - pFull >= 5) {
        const drop = prevFullPct - pFull;
        const score = clampScore(drop * 4);
        flags.push({
          districtId,
          type: 'yoy_regression',
          severity: drop >= 10 ? 5 : 3,
          score,
          explanation: `Year-over-year regression: 100% FHTC share dropped ${drop.toFixed(1)} points from ${prev.year} (${prevFullPct.toFixed(1)}%) to ${latest.year} (${pFull.toFixed(1)}%)`,
          evidence: { ...baseEvidence, prevYear: prev.year, prevPercentFull: Number(prevFullPct.toFixed(2)) },
        });
      }

      if (pZero - prevZeroPct >= 3) {
        const rise = pZero - prevZeroPct;
        const score = clampScore(rise * 8);
        flags.push({
          districtId,
          type: 'yoy_regression',
          severity: rise >= 6 ? 5 : 3,
          score,
          explanation: `Year-over-year regression: 0% FHTC share rose ${rise.toFixed(1)} points from ${prev.year} (${prevZeroPct.toFixed(1)}%) to ${latest.year} (${pZero.toFixed(1)}%)`,
          evidence: { ...baseEvidence, prevYear: prev.year, prevPercentZero: Number(prevZeroPct.toFixed(2)) },
        });
      }
    }
  }

  if (stats.stdZero > 0) {
    const z = (pZero - stats.medianZero) / stats.stdZero;
    if (Math.abs(z) >= 2) {
      const score = clampScore((Math.abs(z) / 3.5) * 100);
      flags.push({
        districtId,
        type: 'outlier',
        severity: Math.abs(z) >= 3 ? 5 : 4,
        score,
        explanation: `Outlier vs state: 0% FHTC share of ${pZero.toFixed(1)}% is ${z.toFixed(2)} standard deviations from the state median (${stats.medianZero.toFixed(1)}%)`,
        evidence: {
          ...baseEvidence,
          z: Number(z.toFixed(2)),
          stateMedianZero: Number(stats.medianZero.toFixed(2)),
          stateStdZero: Number(stats.stdZero.toFixed(2)),
        },
      });
    }
  }

  return flags.map((f) => ({ ...f, severity: Math.max(f.severity, severityFromScore(f.score)) }));
}

export async function scoreAllDistricts(state: string): Promise<ScoreResult[]> {
  const inputHash = sha256(JSON.stringify({ state, ruleVersion: SCORING_RULE_VERSION }));
  const audit = await prisma.auditLog.create({
    data: {
      action: 'anomaly_score',
      inputHash,
      outputHash: '',
      model: null,
      promptVersion: SCORING_RULE_VERSION,
      metadata: { state, status: 'running' },
    },
  });

  let results: ScoreResult[] = [];
  let flagsCreated = 0;

  try {
    const districts = await prisma.district.findMany({ where: { state }, orderBy: { name: 'asc' } });
    if (districts.length === 0) {
      const outputHash = sha256(JSON.stringify({ state, ruleVersion: SCORING_RULE_VERSION, districts: 0 }));
      await prisma.auditLog.update({
        where: { id: audit.id },
        data: { outputHash, metadata: { state, status: 'completed', districts: 0, flagsCreated: 0 } },
      });
      return [];
    }

    const districtIds = districts.map((d) => d.id);
    const snapshots = await prisma.snapshot.findMany({
      where: { districtId: { in: districtIds } },
      orderBy: [{ districtId: 'asc' }, { year: 'desc' }],
    });

    const grouped = new Map<string, SnapshotView[]>();
    for (const s of snapshots) grouped.set(s.districtId, [...(grouped.get(s.districtId) || []), s]);

    const latestByDistrict = new Map<string, SnapshotView>();
    for (const [id, list] of grouped) {
      if (list.length > 0) latestByDistrict.set(id, list[0]);
    }

    const latestPercentsZero: number[] = [];
    for (const s of latestByDistrict.values()) {
      if (hgStats(s)) continue;
      latestPercentsZero.push(pct(s.zeroFhtcVillages, s.totalVillages));
    }
    const stats = { medianZero: median(latestPercentsZero), stdZero: std(latestPercentsZero) };

    const allFlags: FlagDraft[] = [];
    results = districts
      .filter((d) => latestByDistrict.has(d.id))
      .map((d) => {
        const list = grouped.get(d.id)!;
        const latest = list[0];
        const previous = list.slice(1, 3);
        const hg = hgStats(latest);
        const flags = hg
          ? evaluateHarGharDistrict(d.id, latest, previous, hg)
          : evaluateBucketDistrict(d.id, latest, previous, stats);
        allFlags.push(...flags);
        return { districtId: d.id, districtCode: d.code, districtName: d.name, flagCount: flags.length };
      });

    await prisma.$transaction([
      prisma.flag.deleteMany({ where: { district: { state } } }),
      prisma.flag.createMany({
        data: allFlags.map((f) => ({
          districtId: f.districtId,
          type: f.type,
          severity: f.severity,
          score: f.score,
          explanation: f.explanation,
          evidence: f.evidence as Prisma.InputJsonValue,
        })),
      }),
    ]);
    flagsCreated = allFlags.length;

    const outputHash = sha256(
      JSON.stringify({
        state,
        ruleVersion: SCORING_RULE_VERSION,
        districtsScored: results.length,
        flags: allFlags.map((f) => [f.districtId, f.type, f.score]).sort(),
      })
    );
    await prisma.auditLog.update({
      where: { id: audit.id },
      data: {
        outputHash,
        metadata: {
          state,
          status: 'completed',
          ruleVersion: SCORING_RULE_VERSION,
          districtsScored: results.length,
          districtsFlagged: results.filter((r) => r.flagCount > 0).length,
          flagsCreated,
          stateMedianZero: Number(stats.medianZero.toFixed(2)),
          stateStdZero: Number(stats.stdZero.toFixed(2)),
        },
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const outputHash = sha256(JSON.stringify({ state, ruleVersion: SCORING_RULE_VERSION, error: msg }));
    await prisma.auditLog.update({
      where: { id: audit.id },
      data: { outputHash, metadata: { state, status: 'failed', error: msg } },
    });
    throw e;
  }

  return results;
}

export async function scoreDistrict(districtId: string) {
  const district = await prisma.district.findUnique({ where: { id: districtId } });
  if (!district) throw new Error('district_not_found');

  const res = await scoreAllDistricts(district.state);
  return (
    res.find((r) => r.districtId === districtId) || {
      districtId,
      districtCode: district.code,
      districtName: district.name,
      flagCount: 0,
    }
  );
}
