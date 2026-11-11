import { ReactNode, HTMLAttributes } from 'react';
import { cva, VariantProps } from 'class-variance-authority';
import { cn } from './cn';

const badgeVariants = cva('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap', {
  variants: {
    tone: {
      neutral: 'border-border bg-subtle text-ink-secondary',
      brand: 'border-brand/25 bg-brand-soft text-brand',
      success: 'border-sev1-fg/25 bg-sev1-bg text-sev1-fg',
      sev1: 'border-sev1-fg/25 bg-sev1-bg text-sev1-fg',
      sev2: 'border-sev2-fg/25 bg-sev2-bg text-sev2-fg',
      sev3: 'border-sev3-fg/25 bg-sev3-bg text-sev3-fg',
      sev4: 'border-sev4-fg/25 bg-sev4-bg text-sev4-fg',
      sev5: 'border-sev5-fg/25 bg-sev5-bg text-sev5-fg',
      warning: 'border-sev3-fg/25 bg-sev3-bg text-sev3-fg',
      danger: 'border-sev5-fg/25 bg-sev5-bg text-sev5-fg',
      info: 'border-brand/25 bg-brand-soft text-brand',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/**
 * Severity badge — always renders the S1–S5 label (color is never the only
 * signal). severity is 1–5; unknown/0 values fall back to neutral "—".
 */
export function SeverityBadge({ severity, max = 5 }: { severity: number; max?: number }) {
  if (!severity) return <Badge>—</Badge>;
  const sev = Math.min(max, severity);
  return (
    <Badge tone={`sev${sev}` as 'sev1' | 'sev2' | 'sev3' | 'sev4' | 'sev5'}>
      S{sev} · {severityLabelWord(sev)}
    </Badge>
  );
}

export function severityLabelWord(severity: number) {
  if (severity >= 5) return 'critical';
  if (severity >= 4) return 'high';
  if (severity >= 3) return 'medium';
  if (severity >= 2) return 'low';
  return 'info';
}

export { badgeVariants };
