'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from './cn';

/**
 * Generic console table:
 *  - sticky header, row hover in bg-subtle
 *  - whole-row activation: <tr> with router.push + keyboard Enter/Space
 *    (a real <Link> stays in the first cell for right-click / new tab)
 *  - click column header to sort (client-side over the provided data)
 *  - collapses to stacked cards below `md`
 */
export type Column<T> = {
  key: string;
  header: string;
  align?: 'left' | 'right';
  cell: (row: T) => React.ReactNode;
  cardCell?: (row: T) => React.ReactNode;
  sortValue?: (row: T) => number | string;
  hideInCard?: boolean;
};

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  getRowHref,
  initialSort,
  emptyState,
}: {
  rows: T[];
  columns: Column<T>[];
  getRowHref?: (row: T) => string;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  emptyState?: React.ReactNode;
}) {
  const router = useRouter();
  const [sort, setSort] = useState(initialSort ?? null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [rows, columns, sort]);

  function toggleSort(key: string) {
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }));
  }

  if (sorted.length === 0 && emptyState) return <div>{emptyState}</div>;

  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface">
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-subtle">
            <tr>
              {columns.map((c) => {
                const active = sort?.key === c.key;
                const sortable = Boolean(c.sortValue);
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : sortable ? 'none' : undefined}
                    className={cn(
                      'border-b border-border px-3 py-2.5 text-xs font-medium text-ink-muted',
                      c.align === 'right' && 'text-right'
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-input py-0.5 transition-colors hover:text-ink',
                          active && 'text-ink'
                        )}
                      >
                        {c.header}
                        {active ? (
                          sort!.dir === 'asc' ? (
                            <ArrowUp className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <ArrowDown className="h-3 w-3" aria-hidden="true" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" aria-hidden="true" />
                        )}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                key={row.id}
                tabIndex={getRowHref ? 0 : undefined}
                role={getRowHref ? 'link' : undefined}
                aria-label={getRowHref ? `Open ${String((row as { name?: string }).name ?? 'row')}` : undefined}
                onClick={getRowHref ? () => router.push(getRowHref(row)) : undefined}
                onKeyDown={
                  getRowHref
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          router.push(getRowHref(row));
                        }
                      }
                    : undefined
                }
                className={cn(
                  'border-b border-border transition-colors duration-150 last:border-0 hover:bg-subtle',
                  getRowHref && 'cursor-pointer focus-visible:bg-subtle focus-visible:outline-none'
                )}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-3 py-2.5 align-middle', c.align === 'right' && 'text-right')}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <ul className="divide-y divide-border md:hidden">
        {sorted.map((row) => {
          const content = (
            <div className="min-w-0 flex-1">
              {columns.map((c, i) =>
                c.hideInCard ? null : (
                  <div
                    key={c.key}
                    className={cn(
                      'min-w-0',
                      i === 0 ? 'text-sm font-medium text-ink' : 'mt-0.5 text-xs text-ink-secondary'
                    )}
                  >
                    {c.cardCell ? c.cardCell(row) : c.cell(row)}
                  </div>
                )
              )}
            </div>
          );
          return (
            <li key={row.id} className="flex min-h-14 items-center gap-3 px-4 py-3">
              {getRowHref ? (
                <Link href={getRowHref(row)} className="flex min-w-0 flex-1 items-center gap-3">
                  {content}
                  <svg width="8" height="12" viewBox="0 0 8 12" className="shrink-0 text-ink-muted" aria-hidden="true">
                    <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  </svg>
                </Link>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
