'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ScrollText, TrendingUp, RefreshCw, Gauge, LogOut, Menu, X, Loader2 } from 'lucide-react';
import { cn } from '@/components/ui/cn';
import { LogoMark } from '@/components/ui/Logo';
import { ToastProvider, useToast } from '@/components/ui/Toast';

/**
 * App shell: slim white sidebar (240px) + content area.
 *  - Desktop: sidebar is permanent; the top bar holds breadcrumb title area
 *    (pages supply their own PageHeader) and, for state_admin, Sync/Score.
 *  - Mobile: no sidebar — a sticky header with a drawer menu, 44px+ targets.
 * Data flows: user identity comes from the existing /api/auth/whoami endpoint;
 * admin actions POST to the existing /api/sync and /api/score endpoints.
 */

type WhoAmI = {
  id: string;
  email: string;
  name: string;
  role: string;
  state: string;
  district: string | null;
};

const NAV = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Audit log', href: '/audit', icon: ScrollText },
  { label: 'Impact', href: '/impact', icon: TrendingUp },
];

const ROLE_LABEL: Record<string, string> = {
  state_admin: 'State JJM Cell',
  collector: 'Collector',
  viewer: 'Viewer',
};

function scopeChip(user: WhoAmI) {
  if (user.district) return { label: user.district, whole: false };
  return { label: 'Whole state', whole: true };
}

function AdminActions({ user, onDone }: { user: WhoAmI | null; onDone: () => void }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<'sync' | 'score' | null>(null);
  const isStateAdmin = user?.role === 'state_admin';
  const state = user?.state || 'Rajasthan';

  async function run(kind: 'sync' | 'score') {
    setBusy(kind);
    try {
      const res =
        kind === 'sync'
          ? await fetch('/api/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ state }),
            })
          : await fetch('/api/score', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ state }),
            });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'request_failed');
      if (kind === 'score') {
        const results = Array.isArray(data?.results) ? data.results : [];
        const flagged = results.filter((r: { flagCount: number }) => r.flagCount > 0).length;
        toast({ title: `Scored ${results.length} districts, ${flagged} flagged`, variant: 'success' });
      } else {
        toast({ title: 'Sync complete', description: `Latest ${state} data ingested.`, variant: 'success' });
      }
      onDone();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'request_failed';
      toast({
        title: kind === 'sync' ? 'Sync failed' : 'Scoring failed',
        description: msg === 'forbidden' ? 'Only the State JJM Cell can run this.' : msg,
        variant: 'error',
      });
    } finally {
      setBusy(null);
    }
  }

  if (!isStateAdmin) return null;
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => run('sync')}
        disabled={busy !== null}
        className="inline-flex h-11 items-center gap-2 rounded-input border border-border bg-surface px-3.5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-subtle disabled:opacity-60 md:h-9"
      >
        {busy === 'sync' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4 text-ink-secondary" aria-hidden="true" />}
        Sync now
      </button>
      <button
        type="button"
        onClick={() => run('score')}
        disabled={busy !== null}
        className="inline-flex h-11 items-center gap-2 rounded-input bg-brand px-3.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-hover disabled:opacity-60 md:h-9"
      >
        {busy === 'score' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Gauge className="h-4 w-4" aria-hidden="true" />}
        Score now
      </button>
    </div>
  );
}

function UserCard({ user }: { user: WhoAmI }) {
  const scope = scopeChip(user);
  return (
    <div className="rounded-card border border-border bg-subtle p-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand"
        >
          {user.name ? user.name.slice(0, 1).toUpperCase() : '?'}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{user.name}</p>
          <p className="truncate text-xs text-ink-muted">{user.email}</p>
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-1.5">
        <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-ink-secondary">
          {ROLE_LABEL[user.role] ?? user.role}
        </span>
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 text-[11px] font-medium',
            scope.whole ? 'border-brand/25 bg-brand-soft text-brand' : 'border-border bg-surface text-ink-secondary'
          )}
          title={scope.whole ? 'Whole state scope' : 'District-limited scope'}
        >
          {scope.whole ? 'Whole state' : `${scope.label} only`}
        </span>
      </div>
      <button
        type="button"
        onClick={async () => {
          await fetch('/api/auth/logout', { method: 'POST' });
          window.location.href = '/';
        }}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-input border border-border bg-surface px-3 py-2 text-sm font-medium text-ink transition-colors duration-150 hover:bg-subtle"
      >
        <LogOut className="h-3.5 w-3.5 text-ink-secondary" aria-hidden="true" />
        Log out
      </button>
    </div>
  );
}

function SidebarContent({ user }: { user: WhoAmI | null }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="flex h-full flex-col">
      <div className="px-4 pb-4 pt-5">
        <Link href="/dashboard" className="inline-flex items-center gap-2" aria-label="FHTC Sentinel dashboard">
          <LogoMark className="h-7 w-7" />
          <span className="text-[15px] font-semibold tracking-tight text-ink">
            FHTC <span className="text-brand">Sentinel</span>
          </span>
        </Link>
      </div>

      <ul className="flex-1 space-y-1 px-2">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-[44px] items-center gap-2.5 rounded-input px-3 text-sm font-medium transition-colors duration-150',
                  active ? 'bg-brand-soft text-brand' : 'text-ink-secondary hover:bg-subtle hover:text-ink'
                )}
              >
                <Icon className={cn('h-4 w-4', active ? 'text-brand' : 'text-ink-muted')} aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="p-3">
        {user && <UserCard user={user} />}
        {!user && (
          <Link
            href="/login"
            className="flex min-h-[44px] items-center justify-center rounded-input border border-border bg-surface px-3 text-sm font-medium text-ink transition-colors hover:bg-subtle"
          >
            Officer sign in
          </Link>
        )}
        <p className="mt-3 px-1 text-[11px] leading-relaxed text-ink-muted">
          Flags indicate data inconsistency, not ground truth.
        </p>
      </div>
    </nav>
  );
}

const SECTION_LABEL: { match: (p: string) => boolean; label: string }[] = [
  { match: (p) => p === '/audit' || p.startsWith('/audit/'), label: 'Audit log' },
  { match: (p) => p === '/impact' || p.startsWith('/impact/'), label: 'Impact' },
  { match: (p) => p.startsWith('/district'), label: 'Districts' },
  { match: (p) => p === '/dashboard' || p.startsWith('/dashboard/'), label: 'Dashboard' },
];

function sectionLabel(pathname: string) {
  return SECTION_LABEL.find((s) => s.match(pathname))?.label ?? '';
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<WhoAmI | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/auth/whoami')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setUser(d.user);
      })
      .catch(() => {});
  }, []);

  // Close the drawer whenever navigation happens.
  useEffect(() => setDrawerOpen(false), [pathname]);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-page">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-border bg-surface md:block">
          <SidebarContent user={user} />
        </aside>

        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 border-b border-border bg-surface md:hidden">
          <div className="flex h-14 items-center justify-between px-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-expanded={drawerOpen}
              aria-label="Open menu"
              className="flex h-11 w-11 items-center justify-center rounded-input text-ink-secondary transition-colors hover:bg-subtle"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <Link href="/dashboard" aria-label="FHTC Sentinel dashboard">
              <LogoMark className="h-6 w-6" />
            </Link>
            <span className="w-11" aria-hidden="true" />
          </div>
        </header>

        {/* Mobile drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-ink/30"
            />
            <div className="absolute left-0 top-0 flex h-full w-[85vw] max-w-xs flex-col border-r border-border bg-surface shadow-float">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-input text-ink-secondary"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
              <SidebarContent user={user} />
            </div>
          </div>
        )}

        {/* Content column */}
        <div className="md:pl-60">
          {/* Sticky section bar: current section + admin actions (state_admin only) */}
          <div className="sticky top-0 z-30 border-b border-border bg-page/90 backdrop-blur">
            <div className="mx-auto flex w-full max-w-content items-center justify-between gap-3 px-4 py-2.5 md:px-8">
              <span className="truncate text-xs font-medium uppercase tracking-wide text-ink-muted">
                {sectionLabel(pathname)}
              </span>
              <AdminActions user={user} onDone={() => window.location.reload()} />
            </div>
          </div>

          <div className="mx-auto w-full max-w-content px-4 py-5 md:px-8 md:py-8">
            {children}
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}
