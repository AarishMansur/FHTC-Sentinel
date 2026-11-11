'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';
import { cn } from './cn';

/**
 * KPI stat card: muted 12px label, 28px semibold tabular number (counts up
 * once when scrolled in), small context line. Thin colored left accent only
 * when the number needs attention.
 */
type StatCardProps = {
  label: string;
  value: number;
  format?: (n: number) => string;
  context?: string;
  /** Left accent color for cards that need attention (optional). */
  accent?: 'none' | 'sev3' | 'sev4' | 'sev5' | 'brand';
};

const ACCENT_STYLE = {
  none: 'before:hidden',
  brand: 'before:bg-brand',
  sev3: 'before:bg-sev3-fg',
  sev4: 'before:bg-sev4-fg',
  sev5: 'before:bg-sev5-fg',
};

export function StatCard({ label, value, format, context, accent = 'none' }: StatCardProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const duration = 900;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setDisplay(Math.round((1 - Math.pow(1 - p, 3)) * value));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, reduce]);

  return (
    <div
      className={cn(
        'relative rounded-card border border-border bg-surface p-4 before:absolute before:left-0 before:top-3 before:bottom-3 before:w-0.5 before:rounded-full before:content-[""]',
        ACCENT_STYLE[accent]
      )}
    >
      <p className="text-xs text-ink-muted">{label}</p>
      <span ref={ref} className="mt-1 block text-2xl font-semibold tabular-nums text-ink text-[28px] leading-9">
        {format ? format(display) : display.toLocaleString('en-IN')}
      </span>
      {context && <p className="mt-1 truncate text-xs text-ink-secondary">{context}</p>}
    </div>
  );
}
