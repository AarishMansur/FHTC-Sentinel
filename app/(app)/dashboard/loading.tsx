import { PageHeader } from '@/components/ui/PageHeader';

/** Skeleton shown while the dashboard queries run — matches the final layout. */
export default function DashboardLoading() {
  return (
    <div>
      <PageHeader breadcrumbs={[{ label: 'Dashboard' }]} title="Dashboard — Rajasthan" />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-card border border-border bg-surface p-4">
            <div className="skeleton h-3 w-24 rounded" />
            <div className="skeleton mt-2 h-8 w-14 rounded" />
            <div className="skeleton mt-2 h-3 w-32 rounded" />
          </div>
        ))}
      </div>
      <div className="rounded-card border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <div className="skeleton h-4 w-64 rounded" />
        </div>
        <div className="space-y-3 p-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="skeleton h-4 w-36 rounded" />
              <div className="skeleton h-3 w-28 rounded-full" />
              <div className="skeleton h-5 w-20 rounded-full" />
              <div className="skeleton h-4 flex-1 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
