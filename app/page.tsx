import Link from 'next/link';
import { LogoMark } from '@/components/ui/Logo';

/** Clean landing point (also where logging out lands). Server component. */
export default function HomePage() {
  return (
    <main className="dotted-pattern flex min-h-full flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-panel border border-border bg-surface p-8 text-center shadow-none">
        <LogoMark className="mx-auto h-12 w-12" />
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-ink">
          FHTC <span className="text-brand">Sentinel</span>
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
          Jal Jeevan Mission field-verification console
        </p>

        <div className="mt-6 space-y-2">
          <Link
            href="/dashboard"
            className="flex h-11 w-full items-center justify-center rounded-input bg-brand text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-hover"
          >
            Open dashboard
          </Link>
          <Link
            href="/login"
            className="flex h-11 w-full items-center justify-center rounded-input border border-border bg-surface text-sm font-medium text-ink transition-colors duration-150 hover:bg-subtle"
          >
            Officer sign in
          </Link>
        </div>

        <div className="mt-6 border-t border-border pt-4">
          <p className="text-xs leading-relaxed text-ink-muted">
            Government-facing. Flags indicate data inconsistency, not ground truth.
          </p>
        </div>
      </div>
    </main>
  );
}
