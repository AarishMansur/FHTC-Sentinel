import { cn } from './cn';

/**
 * Slim horizontal risk/heat bar (0–100) drawn on the severity scale.
 * The numeric value always accompanies the bar — color is not the sole signal.
 */
const SEGMENT_COLORS = ['bg-sev1-fg', 'bg-sev2-fg', 'bg-sev3-fg', 'bg-sev4-fg', 'bg-sev5-fg'] as const;

function colorClass(value: number) {
  if (value <= 20) return 'bg-sev1-fg';
  if (value <= 40) return 'bg-sev2-fg';
  if (value <= 60) return 'bg-sev3-fg';
  if (value <= 80) return 'bg-sev4-fg';
  return 'bg-sev5-fg';
}

export function HeatBar({ value, className, showTicks = true }: { value: number; className?: string; showTicks?: boolean }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('flex w-full items-center gap-2', className)}>
      <div
        role="img"
        aria-label={`Risk score ${v} of 100`}
        className="relative h-3 w-28 overflow-hidden rounded-full bg-subtle"
      >
        <div className={cn('h-full rounded-full transition-[width] duration-200', colorClass(v))} style={{ width: `${v}%` }} />
        {showTicks && (
          <span aria-hidden="true" className="absolute inset-y-0 left-[20%] w-px bg-border/80" />
        )}
        {showTicks && (
          <span aria-hidden="true" className="absolute inset-y-0 left-[40%] w-px bg-border/80" />
        )}
        {showTicks && (
          <span aria-hidden="true" className="absolute inset-y-0 left-[60%] w-px bg-border/80" />
        )}
        {showTicks && (
          <span aria-hidden="true" className="absolute inset-y-0 left-[80%] w-px bg-border/80" />
        )}
      </div>
      <span className="text-sm font-semibold tabular-nums text-ink">{v}</span>
      <span className="sr-only">out of 100</span>
    </div>
  );
}

/**
 * Horizontal stacked severity breakdown (Impact page). Segment count shows
 * beside the chart; legend chips carry S-labels.
 */
export function StackedSeverityBar({ counts }: { counts: { severity: number; count: number }[] }) {
  const total = counts.reduce((s, c) => s + c.count, 0);
  if (total === 0) return null;
  return (
    <div className="flex h-4 w-full overflow-hidden rounded-full bg-subtle" role="img" aria-label={`Flags by severity: ${counts.map((c) => `S${c.severity} ${c.count}`).join(', ')}`}>
      {counts.map((c) =>
        c.count > 0 ? (
          <div
            key={c.severity}
            className={cn('h-full', SEGMENT_COLORS[c.severity - 1])}
            style={{ width: `${(c.count / total) * 100}%` }}
            title={`S${c.severity}: ${c.count}`}
          />
        ) : null
      )}
    </div>
  );
}
