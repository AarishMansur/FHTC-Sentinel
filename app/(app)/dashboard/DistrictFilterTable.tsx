'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Download, Inbox, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { HeatBar } from '@/components/ui/HeatBar';
import { Badge, SeverityBadge } from '@/components/ui/Badge';
import { Input, Toggle } from '@/components/ui/Input';
import { cn } from '@/components/ui/cn';

export type DistrictRow = {
  id: string;
  name: string;
  code: string;
  year: number | null;
  totalVillages: number | null;
  zeroFhtcVillages: number | null;
  fullFhtcVillages: number | null;
  notCertified: number;
  flagCount: number;
  maxSeverity: number;
  topFlag: string | null;
  hasRegression: boolean;
  risk: number;
};

/** Rule names, ordered by aggressiveness for the select. */
const RULE_TYPES = ['high_zero_fhtc', 'yoy_regression', 'tension', 'outlier'];

const fmtIN = (n: number | null) => (n !== null ? n.toLocaleString('en-IN') : '—');

/** Filter bar + ranked flag table. Pure presentation — data comes from the server page. */
export function DistrictFilterTable({ rows }: { rows: DistrictRow[] }) {
  const [query, setQuery] = useState('');
  const [severities, setSeverities] = useState<number[]>([]);
  const [rule, setRule] = useState('all');
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (query && !`${r.name} ${r.code}`.toLowerCase().includes(query.toLowerCase())) return false;
        if (severities.length > 0 && !severities.includes(Math.max(1, r.maxSeverity))) return false;
        if (rule !== 'all' && r.topFlag !== rule) return false;
        if (flaggedOnly && r.flagCount === 0) return false;
        return true;
      }),
    [rows, query, severities, rule, flaggedOnly]
  );

  const columns: Column<DistrictRow>[] = [
    {
      key: 'name',
      header: 'District',
      sortValue: (r) => r.name,
      cell: (r) => (
        <div className="min-w-0">
          <Link
            href={`/district/${r.id}`}
            className="font-medium text-ink transition-colors duration-150 hover:text-brand"
          >
            {r.name}
          </Link>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
            <code className="font-mono">{r.code}</code>
            <span>· FY {r.year ?? '—'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'risk',
      header: 'Risk score',
      align: 'right',
      sortValue: (r) => r.risk,
      cell: (r) => <HeatBar value={r.risk} className="justify-end" />,
      cardCell: (r) => <span className="tabular-nums font-medium text-ink">Risk {r.risk}/100</span>,
    },
    {
      key: 'severity',
      header: 'Top severity',
      sortValue: (r) => r.maxSeverity,
      hideInCard: true,
      cell: (r) => <SeverityBadge severity={r.maxSeverity} />,
    },
    {
      key: 'topFlag',
      header: 'Top flag',
      sortValue: (r) => r.topFlag ?? 'zzz',
      hideInCard: true,
      cell: (r) =>
        r.topFlag ? (
          <code className="font-mono text-xs text-ink-secondary">{r.topFlag}</code>
        ) : (
          <span className="text-xs text-ink-muted">—</span>
        ),
    },
    {
      key: 'villages',
      header: 'Villages',
      align: 'right',
      sortValue: (r) => r.totalVillages ?? -1,
      hideInCard: true,
      cell: (r) => (
        <div className="text-right leading-tight">
          <span className="tabular-nums font-medium text-ink">{fmtIN(r.totalVillages)}</span>
          <div className="text-[11px] text-ink-muted">
            100%: <span className="tabular-nums">{fmtIN(r.fullFhtcVillages)}</span> · 0%:{' '}
            <span className="tabular-nums">{fmtIN(r.zeroFhtcVillages)}</span>
          </div>
        </div>
      ),
      cardCell: (r) => (
        <span className="tabular-nums">
          Villages {fmtIN(r.totalVillages)} · 100% {fmtIN(r.fullFhtcVillages)} · 0% {fmtIN(r.zeroFhtcVillages)}
        </span>
      ),
    },
    {
      key: 'trend',
      header: 'Trend',
      align: 'right',
      sortValue: (r) => (r.hasRegression ? 1 : 0),
      hideInCard: true,
      cell: (r) =>
        r.hasRegression ? (
          <Badge tone="danger" title="Year-over-year regression flagged">
            <TrendingDown className="h-3 w-3" aria-hidden="true" /> declined
          </Badge>
        ) : (
          <span className="text-ink-muted" title="No regression flagged">
            <TrendingUp className="h-3 w-3" aria-hidden="true" />
            <span className="sr-only">No regression</span>
          </span>
        ),
    },
  ];

  const activeFilters = severities.length > 0 || rule !== 'all' || flaggedOnly || query !== '';

  return (
    <div>
      {/* Filter bar */}
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div className="min-w-[180px] flex-1">
          <label htmlFor="district-search" className="sr-only">
            Search district
          </label>
          <Input
            id="district-search"
            type="search"
            placeholder="Search district or code…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <fieldset className="flex items-center gap-1">
          <legend className="sr-only">Filter by severity</legend>
          {[1, 2, 3, 4, 5].map((s) => {
            const on = severities.includes(s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                onClick={() => setSeverities((prev) => (on ? prev.filter((x) => x !== s) : [...prev, s]))}
                title={`Severity ${s}`}
                className={cn(
                  'h-11 min-w-9 rounded-input border px-2 text-xs font-medium transition-colors duration-150 md:h-11',
                  on ? 'border-brand bg-brand-soft text-brand' : 'border-border bg-surface text-ink-secondary hover:bg-subtle'
                )}
              >
                S{s}
              </button>
            );
          })}
        </fieldset>

        <div>
          <label htmlFor="rule-filter" className="sr-only">
            Filter by rule type
          </label>
          <select
            id="rule-filter"
            value={rule}
            onChange={(e) => setRule(e.target.value)}
            className="h-11 rounded-input border border-border bg-surface px-3 text-sm text-ink transition-colors hover:border-border-strong focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
          >
            <option value="all">All rules</option>
            {RULE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <Toggle checked={flaggedOnly} onChange={setFlaggedOnly} label="Flagged only" />

        <a
          href={`/api/export/flags?state=${encodeURIComponent('Rajasthan')}`}
          className="inline-flex h-11 items-center gap-2 rounded-input border border-border bg-surface px-3.5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-subtle"
        >
          <Download className="h-4 w-4 text-ink-secondary" aria-hidden="true" />
          Export CSV
        </a>
      </div>

      <p className="mb-2 text-xs text-ink-muted" aria-live="polite">
        {filtered.length} of {rows.length} districts{activeFilters ? ' (filtered)' : ''}
      </p>

      <DataTable
        rows={filtered}
        columns={columns}
        getRowHref={(r) => `/district/${r.id}`}
        initialSort={{ key: 'risk', dir: 'desc' }}
        emptyState={
          <div className="flex flex-col items-center rounded-card px-6 py-10 text-center">
            <Inbox className="h-8 w-8 text-ink-muted" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-ink">No districts match these filters</p>
            <p className="mt-1 text-sm text-ink-secondary">Clear a filter or run “Score now” for fresher flags.</p>
          </div>
        }
      />
    </div>
  );
}
