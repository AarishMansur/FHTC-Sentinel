'use client';

import { cn } from './cn';

/** Small segmented control (e.g. EN / हिंदी). Keys must be stable strings. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="inline-flex rounded-input border border-border bg-subtle p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'min-h-9 min-w-16 rounded-[7px] px-3.5 text-sm font-medium transition-colors duration-150',
            value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-ink-secondary hover:text-ink'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
