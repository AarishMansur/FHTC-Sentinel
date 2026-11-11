import { cn } from './cn';
import { Clock3, CloudOff } from 'lucide-react';

/**
 * Data-freshness chip shown near page titles. Uses the warning color when the
 * console has fallen back / has no recent sync, so officers always know how
 * fresh the data behind the page is.
 */
function formatIST(d?: string | Date | null) {
  if (!d) return null;
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

type SourceChipProps = {
  /** e.g. "Live: ejalshakti J8 (FY 2026-27)" */
  source?: string;
  lastSync?: string | Date | null;
  /** True when showing an offline/fallback state (warning styling). */
  fallback?: boolean;
  className?: string;
};

export default function SourceChip({ source, lastSync, fallback = false, className = '' }: SourceChipProps) {
  const synced = formatIST(lastSync);
  const missing = !source || fallback;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs',
        missing ? 'border-sev3-fg/30 bg-sev3-bg text-sev3-fg' : 'border-border bg-subtle text-ink-secondary',
        className
      )}
      title={missing ? 'Offline fallback snapshot — data may be stale' : 'Data source and last sync'}
    >
      {missing ? (
        <CloudOff className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <Clock3 className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true" />
      )}
      <span className="font-medium">{missing ? 'Offline fallback snapshot' : source}</span>
      {synced && <span className="text-ink-muted">· Synced {synced} IST</span>}
    </span>
  );
}
