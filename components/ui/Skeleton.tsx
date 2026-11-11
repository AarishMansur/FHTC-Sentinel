import { CSSProperties } from 'react';
import { cn } from './cn';

/** Loading placeholder rows matching the final layout's shape. */
export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn('skeleton rounded-card', className)} style={style} aria-hidden="true" />;
}

export function SkeletonRows({ rows = 8, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-card border border-border bg-surface p-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <Skeleton className="h-4 w-[24%]" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 hidden w-20 sm:block" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
