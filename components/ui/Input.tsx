import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { cn } from './cn';

/**
 * Form controls: 8px radius, 40px desktop height (44px+ effective on mobile
 * via h-11 override by callers). Labels are always visible; errors are inline.
 */
export function Label({ children, htmlFor, className }: { children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn('block text-sm font-medium text-ink', className)}>
      {children}
    </label>
  );
}

export function Input({ className, invalid, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-input border bg-surface px-3 text-sm text-ink transition-colors duration-150 placeholder:text-ink-muted hover:border-border-strong focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25',
        invalid ? 'border-danger' : 'border-border',
        className
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export function Select({ className, invalid, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      className={cn(
        'h-11 w-full rounded-input border bg-surface px-3 text-sm text-ink transition-colors duration-150 hover:border-border-strong focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25',
        invalid ? 'border-danger' : 'border-border',
        className
      )}
      aria-invalid={invalid || undefined}
      {...props}
    >
      {children}
    </select>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex min-h-[36px] items-center gap-2 text-sm text-ink-secondary"
    >
      <span
        aria-hidden="true"
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-150',
          checked ? 'border-brand bg-brand' : 'border-border-strong bg-subtle'
        )}
      >
        <span
          className={cn(
            'inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-150',
            checked ? 'translate-x-[18px]' : 'translate-x-0.5'
          )}
        />
      </span>
      {label}
    </button>
  );
}
