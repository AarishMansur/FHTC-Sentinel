'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

/**
 * Coverage buckets per year, stacked percentages.
 * A sequential teal ramp (dark→light) — never rainbow. The legend chips and
 * tooltip values keep the segments readable without relying on color alone.
 */
export type BucketDatum = { year: number; full: number; partial: number; zero: number };

const RAMP = {
  full: '#0F5E7A',
  partial: '#7FB3C4',
  zero: '#CFE0E6',
};

export function BucketChart({ data }: { data: BucketDatum[] }) {
  return (
    <div className="h-64 w-full" role="img" aria-label={`Stacked coverage buckets by year: ${data.map((d) => `${d.year}: 100% bucket ${d.full.toFixed(1)}%, intermediate ${d.partial.toFixed(1)}%, 0% bucket ${d.zero.toFixed(1)}%`).join('; ')}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="#D3D2CA" strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="year"
            tickLine={false}
            axisLine={{ stroke: '#D3D2CA' }}
            tick={{ fontSize: 12, fill: '#8C8C86' }}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: '#8C8C86' }}
          />
          <Tooltip
            cursor={{ fill: 'rgba(15, 94, 122, 0.06)' }}
            contentStyle={{
              borderRadius: 12,
              border: '1px solid #E6E5DF',
              boxShadow: '0 8px 24px -8px rgba(20,20,20,0.16)',
              fontSize: 12,
              padding: '8px 12px',
            }}
            formatter={(value: unknown, name: unknown) =>
              [`${Number(value ?? 0).toFixed(1)}%`, String(name ?? '')] as [string, string]
            }
          />
          <Bar dataKey="full" name="100% FHTC" stackId="cov" fill={RAMP.full} radius={[2, 0, 0, 0]} maxBarSize={56} />
          <Bar dataKey="partial" name="Intermediate buckets" stackId="cov" fill={RAMP.partial} maxBarSize={56} />
          <Bar dataKey="zero" name="0% FHTC" stackId="cov" fill={RAMP.zero} radius={[0, 2, 2, 0]} maxBarSize={56} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-ink-secondary" aria-hidden="true">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: RAMP.full }} /> 100% FHTC</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: RAMP.partial }} /> Intermediate</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: RAMP.zero }} /> 0% FHTC</span>
      </div>
    </div>
  );
}
