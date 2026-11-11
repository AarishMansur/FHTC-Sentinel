import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { ReactNode } from 'react';

/**
 * Breadcrumbs + page title + action row, rendered at the top of every page.
 * Server-safe: pure markup.
 */
export function PageHeader({
  breadcrumbs,
  title,
  action,
  meta,
}: {
  breadcrumbs: { label: string; href?: string }[];
  title: ReactNode;
  action?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header className="mb-5">
      <nav aria-label="Breadcrumb" className="mb-1.5">
        <ol className="flex items-center gap-1 text-xs text-ink-muted">
          {breadcrumbs.map((b, i) => (
            <li key={i} className="flex min-w-0 items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" aria-hidden="true" />}
              {b.href ? (
                <Link href={b.href} className="truncate transition-colors duration-150 hover:text-ink">
                  {b.label}
                </Link>
              ) : (
                <span aria-current="page" className="truncate">
                  {b.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-ink md:text-2xl">{title}</h1>
          {meta && <div className="mt-1.5 flex flex-wrap items-center gap-2">{meta}</div>}
        </div>
        {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
      </div>
    </header>
  );
}
