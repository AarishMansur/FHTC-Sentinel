import crypto from 'crypto';
import axios from 'axios';
import prisma from './prisma';
import { ESRI_CONFIG, ESRI_YEARS, EsriYear } from '../config/esri';
import { fetchHarGharJal, HarGharJalDistrictRow } from './ingest/jjmHarGhar.mjs';
import { rajasthanHarGharJal } from '../data/rajasthanHarGharJal';

export const INGEST_RULE_VERSION = 'ingest.v2';
export const HAR_GHAR_JAL_SOURCE = 'har_ghar_jal';

const HAR_GHAR_JAL_URL =
  'https://ejalshakti.gov.in/JJM/JJMReports/Physical/JJMRep_HarGharJalVillage.aspx';

const J8_STATE_CONFIG: Record<string, { code: string; abbr: string } | undefined> = {
  rajasthan: { code: '27', abbr: 'RJ' },
};

const J8_FALLBACK_FINYEAR = '2026-2027';

export type SyncResult = {
  success: boolean;
  source: string;
  state: string;
  sourceUrl: string;
  pages: number;
  totalFetched: number;
  districtsUpserted: number;
  snapshotsUpserted: number;
  featuresSkipped: number;
  errors: string[];
  warnings: string[];
  startedAt: string;
  finishedAt?: string;
};

function sha256(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function createLimiter(concurrency: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  const pump = () => {
    while (active < concurrency && queue.length > 0) {
      active += 1;
      queue.shift()!();
    }
  };

  return function schedule<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const start = () => {
        task()
          .then(resolve, reject)
          .finally(() => {
            active -= 1;
            pump();
          });
      };
      queue.push(start);
      pump();
    });
  };
}

async function fetchWithRetry(url: string, params: Record<string, unknown>) {
  const attempts = ESRI_CONFIG.requestRetryAttempts;
  let lastError: unknown = new Error('request_failed');

  for (let attempt = 0; attempt <= attempts; attempt++) {
    try {
      const resp = await axios.get(url, { params, timeout: ESRI_CONFIG.requestTimeoutMs });
      if (resp.status === 200) return resp.data;
      lastError = new Error(`arcgis_status_${resp.status}`);
    } catch (e) {
      lastError = e;
    }
    if (attempt < attempts) {
      const delay = 1000 * 2 ** attempt + Math.floor(Math.random() * 500);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function toCount(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

function normalizeFeature(attrs: Record<string, unknown>, fallbackState: string) {
  const code = attrs[ESRI_CONFIG.fields.districtCode || 'DIST_CODE'];
  const name = attrs[ESRI_CONFIG.fields.districtName || 'DIST_NAME'];
  const state = (attrs[ESRI_CONFIG.fields.stateName || 'STATE'] as string) || fallbackState;

  return {
    code: code ? String(code).trim() : null,
    name: name ? String(name).trim() : null,
    state: String(state).trim() || fallbackState,
    attrs,
  };
}

function yearBuckets(year: EsriYear, attrs: Record<string, unknown>) {
  const mapping = ESRI_CONFIG.bucketFields[`year${year}`] || {};
  const buckets: Record<string, number> = {};

  for (const [bucket, field] of Object.entries(mapping)) {
    if (!field) continue;
    const value = toCount(attrs[field]);
    if (value !== null) buckets[bucket] = value;
  }
  return buckets;
}

function baseUrlFor(source: string) {
  return source === HAR_GHAR_JAL_SOURCE ? HAR_GHAR_JAL_URL : ESRI_CONFIG.baseUrl;
}

async function beginSyncAudit(stateName: string, source: string, sourceUrl: string, extra: Record<string, unknown> = {}) {
  return prisma.auditLog.create({
    data: {
      action: 'ingest_sync',
      inputHash: sha256(JSON.stringify({ state: stateName, source, sourceUrl, ...extra })),
      outputHash: '',
      model: null,
      promptVersion: INGEST_RULE_VERSION,
      metadata: { state: stateName, source, startedAt: new Date().toISOString(), status: 'running' },
    },
  });
}

async function endSyncAudit(auditId: string, result: SyncResult) {
  result.finishedAt = new Date().toISOString();
  const { startedAt: _s, ...hashable } = result;
  const outputHash = sha256(JSON.stringify(hashable));
  await prisma.auditLog.update({
    where: { id: auditId },
    data: {
      outputHash,
      metadata: {
        source: result.source,
        state: result.state,
        startedAt: result.startedAt,
        finishedAt: result.finishedAt,
        status: result.success ? 'completed' : 'failed',
        pages: result.pages,
        totalFetched: result.totalFetched,
        districtsUpserted: result.districtsUpserted,
        snapshotsUpserted: result.snapshotsUpserted,
        featuresSkipped: result.featuresSkipped,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
        errors: result.errors.slice(0, 20),
        warnings: result.warnings.slice(0, 20),
      },
    },
  });
}

export function slugForDistrictCode(name: string) {
  return (name || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16) || 'UNKNOWN';
}

export function finyearToYear(finyear: string | undefined): number | null {
  if (!finyear) return null;
  const range = finyear.match(/(\d{4})\D+(\d{2,4})/);
  if (range) {
    const start = range[1];
    const endRaw = range[2];
    const end = endRaw.length === 4 ? endRaw : `${start.slice(0, 2)}${endRaw}`;
    return Number(end);
  }
  const y = Number(finyear);
  return Number.isInteger(y) && y > 1990 && y < 2100 ? y : null;
}

export async function ingestState(stateName: string, opts: { pageSize?: number } = {}): Promise<SyncResult> {
  const pageSize = opts.pageSize || ESRI_CONFIG.pageSize;
  const sourceUrl = ESRI_CONFIG.baseUrl;
  const result: SyncResult = {
    success: false,
    source: 'esri',
    state: stateName,
    sourceUrl,
    pages: 0,
    totalFetched: 0,
    districtsUpserted: 0,
    snapshotsUpserted: 0,
    featuresSkipped: 0,
    errors: [],
    warnings: [],
    startedAt: new Date().toISOString(),
  };

  if (!stateName || stateName.length < 2) {
    result.errors.push('invalid_state_name');
    return result;
  }

  const audit = await beginSyncAudit(stateName, 'esri', sourceUrl);

  try {
    const schedule = createLimiter(ESRI_CONFIG.concurrency);
    let offset = 0;
    let more = true;
    const districtIdCache = new Map<string, string>();

    while (more) {
      const data = await fetchWithRetry(`${sourceUrl}/query`, {
        f: 'json',
        where: `${ESRI_CONFIG.fields.stateName} = '${stateName.replace(/'/g, "''")}'`,
        outFields: '*',
        returnGeometry: false,
        resultOffset: offset,
        resultRecordCount: pageSize,
      });

      if (!data || !Array.isArray(data.features)) {
        result.errors.push('unexpected_arcgis_response_shape');
        break;
      }

      const features = data.features;
      result.pages += 1;
      result.totalFetched += features.length;

      await Promise.all(
        features.map((feat: { attributes?: Record<string, unknown> }) =>
          schedule(async () => {
            const attrs = feat.attributes || {};
            const norm = normalizeFeature(attrs, stateName);
            const featureKey = norm.code || norm.name || '';

            if (!norm.code || !norm.name) {
              result.featuresSkipped += 1;
              result.warnings.push(`feature_skipped_missing_identity[${featureKey || 'unnamed'}]`);
              return;
            }

            try {
              let districtId = districtIdCache.get(`${norm.state}:${norm.code}`);
              if (!districtId) {
                const district = await prisma.district.upsert({
                  where: { code: norm.code },
                  update: { name: norm.name, state: norm.state },
                  create: { code: norm.code, name: norm.name, state: norm.state },
                });
                districtId = district.id;
                districtIdCache.set(`${norm.state}:${norm.code}`, districtId);
              }
              result.districtsUpserted += 1;

              for (const year of ESRI_YEARS) {
                const totalField = ESRI_CONFIG.fields[`year${year}_totalVillages`];
                const zeroField = ESRI_CONFIG.fields[`year${year}_zeroFhtc`];
                const fullField = ESRI_CONFIG.fields[`year${year}_fullFhtc`];

                const total = totalField ? toCount(attrs[totalField]) : null;
                const zero = zeroField ? toCount(attrs[zeroField]) : null;
                const full = fullField ? toCount(attrs[fullField]) : null;

                if (total === null || zero === null || full === null) {
                  result.warnings.push(`${norm.code}:missing_fields_${year}`);
                  continue;
                }

                const snapshotData = {
                  districtId,
                  year,
                  totalVillages: total,
                  zeroFhtcVillages: zero,
                  fullFhtcVillages: full,
                  otherBuckets: yearBuckets(year, attrs),
                };

                await prisma.snapshot.upsert({
                  where: { districtId_year: { districtId, year } },
                  update: {
                    totalVillages: snapshotData.totalVillages,
                    zeroFhtcVillages: snapshotData.zeroFhtcVillages,
                    fullFhtcVillages: snapshotData.fullFhtcVillages,
                    otherBuckets: snapshotData.otherBuckets,
                    fetchedAt: new Date(),
                  },
                  create: snapshotData,
                });
                result.snapshotsUpserted += 1;
              }
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              result.errors.push(`${norm.code}:${msg.slice(0, 200)}`);
            }
          })
        )
      );

      offset += features.length;
      more = features.length === pageSize;
    }

    result.success = result.totalFetched > 0 && result.errors.length === 0;
    if (result.totalFetched === 0) result.errors.push('no_features_returned_for_state');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    result.errors.push(`sync_failed:${msg.slice(0, 200)}`);
  }

  await endSyncAudit(audit.id, result);
  return result;
}

export async function ingestHarGharJal(
  stateName: string,
  opts: { finyear?: string } = {}
): Promise<SyncResult> {
  const cfg = J8_STATE_CONFIG[stateName.trim().toLowerCase()];
  const result: SyncResult = {
    success: false,
    source: HAR_GHAR_JAL_SOURCE,
    state: stateName,
    sourceUrl: HAR_GHAR_JAL_URL,
    pages: 1,
    totalFetched: 0,
    districtsUpserted: 0,
    snapshotsUpserted: 0,
    featuresSkipped: 0,
    errors: [],
    warnings: [],
    startedAt: new Date().toISOString(),
  };

  if (!stateName || stateName.length < 2) {
    result.errors.push('invalid_state_name');
    return result;
  }
  if (!cfg) {
    result.errors.push('unsupported_state_for_har_ghar_jal_source');
    return result;
  }

  const audit = await beginSyncAudit(stateName, HAR_GHAR_JAL_SOURCE, HAR_GHAR_JAL_URL, {
    stateCode: cfg.code,
    finyear: opts.finyear ?? null,
  });

  try {
    let rows: HarGharJalDistrictRow[] = [];
    let finyear: string | undefined = opts.finyear;

    try {
      const res = await fetchHarGharJal(cfg.code, opts.finyear);
      rows = res.districts;
      finyear = opts.finyear ?? res.finyear;
    } catch (e) {
      const fallbackRows = stateName.trim().toLowerCase() === 'rajasthan' ? rajasthanHarGharJal : [];
      if (fallbackRows.length === 0) {
        const msg = e instanceof Error ? e.message : String(e);
        result.errors.push(`fetch_failed_and_no_fallback_for_state:${msg.slice(0, 200)}`);
      } else {
        rows = fallbackRows;
        finyear = finyear ?? J8_FALLBACK_FINYEAR;
        result.warnings.push('live_source_unavailable_using_fallback_snapshot');
      }
    }

    if (finyear === undefined || finyear === null) {
      result.errors.push('missing_finyear');
    }

    if (rows.length > 0 && finyear) {
      const year = finyearToYear(finyear);
      if (!year) {
        result.errors.push(`unparseable_finyear:${finyear}`);
      } else {
        const schedule = createLimiter(ESRI_CONFIG.concurrency);
        result.totalFetched = rows.length;

        await Promise.all(
          rows.map((row) =>
            schedule(async () => {
              const name = String(row.district || '').trim();
              if (!name) {
                result.featuresSkipped += 1;
                result.warnings.push('row_skipped_no_district_name');
                return;
              }
              const code = `${cfg.abbr}-${slugForDistrictCode(name)}`;

              try {
                const district = await prisma.district.upsert({
                  where: { code },
                  update: { name, state: stateName },
                  create: { code, name, state: stateName },
                });
                result.districtsUpserted += 1;

                const totalVillages = toCount(row.villages) ?? 0;
                const reported = Math.min(totalVillages, toCount(row.hgjVillagesReported) ?? 0);
                const certified = Math.min(reported, toCount(row.hgjVillagesCertified) ?? 0);

                const snapshotData = {
                  districtId: district.id,
                  year,
                  totalVillages,
                  zeroFhtcVillages: Math.max(0, totalVillages - reported),
                  fullFhtcVillages: certified,
                  otherBuckets: {
                    source: HAR_GHAR_JAL_SOURCE,
                    finyear,
                    villagesReported: reported,
                    villagesCertified: certified,
                    reportedNotCertified: Math.max(0, reported - certified),
                    blocks: toCount(row.blocks) ?? 0,
                    hgjBlocksReported: toCount(row.hgjBlocksReported) ?? 0,
                    hgjBlocksCertified: toCount(row.hgjBlocksCertified) ?? 0,
                    panchayats: toCount(row.panchayats) ?? 0,
                    hgjPanchayatsReported: toCount(row.hgjPanchayatsReported) ?? 0,
                    hgjPanchayatsCertified: toCount(row.hgjPanchayatsCertified) ?? 0,
                  },
                };

                await prisma.snapshot.upsert({
                  where: { districtId_year: { districtId: district.id, year } },
                  update: {
                    totalVillages: snapshotData.totalVillages,
                    zeroFhtcVillages: snapshotData.zeroFhtcVillages,
                    fullFhtcVillages: snapshotData.fullFhtcVillages,
                    otherBuckets: snapshotData.otherBuckets,
                    fetchedAt: new Date(),
                  },
                  create: snapshotData,
                });
                result.snapshotsUpserted += 1;
              } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                result.errors.push(`${code}:${msg.slice(0, 200)}`);
              }
            })
          )
        );
      }
    }

    result.success = result.totalFetched > 0 && result.errors.length === 0;
    if (result.totalFetched === 0 && result.errors.length === 0) result.errors.push('no_rows_returned_for_state');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    result.errors.push(`sync_failed:${msg.slice(0, 200)}`);
  }

  await endSyncAudit(audit.id, result);
  return result;
}
