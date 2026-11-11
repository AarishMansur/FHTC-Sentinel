import { cn } from './cn';

/**
 * Brand mark: a water droplet over contour rings — "trust in water data".
 * Pure SVG, prints cleanly.
 */
export function LogoMark({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label="FHTC Sentinel">
      <circle cx="16" cy="17" r="13" fill="none" stroke="#BFDCE6" strokeWidth="1.5" />
      <circle cx="16" cy="17" r="9" fill="none" stroke="#7FB3C4" strokeWidth="1.5" />
      <path
        d="M16 3.5c4.4 5 7 8.9 7 12.6a7 7 0 1 1-14 0c0-3.7 2.6-7.6 7-12.6z"
        fill="#0F5E7A"
      />
    </svg>
  );
}

export function Logo({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark className="h-7 w-7" />
      {!compact && (
        <span className="text-[15px] font-semibold tracking-tight text-ink">
          FHTC <span className="text-brand">Sentinel</span>
        </span>
      )}
    </span>
  );
}
