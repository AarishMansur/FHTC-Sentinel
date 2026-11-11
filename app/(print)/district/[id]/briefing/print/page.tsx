import Link from 'next/link';
import { ArrowLeft, Printer as PrinterIcon } from 'lucide-react';
import prisma from '@/lib/prisma';
import PrintButton from '@/components/PrintButton';
import { LogoMark } from '@/components/ui/Logo';
import { EmptyState } from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';

/**
 * A4 one-pager print view. Pure white, black text, no shadows; color appears
 * only on badges (which also print legibly via the S1–S5 text labels).
 * Nav and print controls are browser/print:hidden.
 */
export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const district = await prisma.district.findUnique({ where: { id } });
  if (!district) {
    return (
      <div className="page-bg px-4 py-10">
        <EmptyState
          title="District not found"
          description="Open the dashboard for the current district list."
          action={
            <Link href="/dashboard" className="text-sm font-medium text-brand hover:text-brand-hover">
              Go to dashboard →
            </Link>
          }
        />
      </div>
    );
  }

  const [en, hi] = await Promise.all([
    prisma.briefing.findUnique({ where: { districtId_language: { districtId: id, language: 'en' } } }),
    prisma.briefing.findUnique({ where: { districtId_language: { districtId: id, language: 'hi' } } }),
  ]);

  if (!en && !hi) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState
          title="No briefing generated yet"
          description={`${district.name}: generate the briefing first from the district briefing page.`}
          action={
            <Link
              href={`/district/${id}/briefing`}
              className="text-sm font-medium text-brand hover:text-brand-hover"
            >
              Open briefing page →
            </Link>
          }
        />
      </div>
    );
  }

  const generatedAt = en?.createdAt ?? hi?.createdAt;

  return (
    <main className="mx-auto min-h-screen bg-white px-4 py-8 print:p-0 md:px-8">
      {/* Browser-only toolbar */}
      <nav data-print="hide" className="mx-auto mb-6 flex max-w-3xl items-center justify-between gap-3">
        <Link
          href={`/district/${id}/briefing`}
          className="inline-flex h-9 items-center gap-2 rounded-input px-3 text-sm font-medium text-ink-secondary transition-colors hover:bg-page hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Link>
        <div className="flex items-center gap-2">
          <span className="hidden gap-1.5 text-xs text-ink-muted sm:flex">
            <PrinterIcon className="h-3.5 w-3.5" aria-hidden="true" />
            A4 one-pager per language
          </span>
          <PrintButton />
        </div>
      </nav>

      {/* A4 sheet */}
      <article className="print-avoid-break mx-auto w-full max-w-3xl border border-border bg-white p-8 shadow-float md:p-12 print:max-w-none print:border-0 print:p-0 print:shadow-none">
        {/* Letterhead */}
        <header className="print-avoid-break flex items-start justify-between gap-4 border-b-2 border-ink pb-4">
          <div className="flex items-start gap-3">
            <LogoMark className="mt-1 h-8 w-8" />
            <div>
              <h1 className="text-lg font-semibold uppercase tracking-wide text-black">
                District Collector Briefing
              </h1>
              <p className="text-sm text-black">
                FHTC Sentinel — Deterministic field-verification audit
              </p>
            </div>
          </div>
          <dl className="text-right text-xs text-black">
            <div className="flex justify-between gap-6">
              <dt className="font-medium">District</dt>
              <dd className="font-mono">
                {district.name} ({district.code})
              </dd>
            </div>
            <div className="mt-0.5 flex justify-between gap-6">
              <dt className="font-medium">State</dt>
              <dd>{district.state}</dd>
            </div>
            <div className="mt-0.5 flex justify-between gap-6">
              <dt className="font-medium">Generated</dt>
              <dd className="tabular-nums">
                {generatedAt
                  ? new Date(generatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })
                  : '—'}
              </dd>
            </div>
          </dl>
        </header>

        {/* Stored deterministic content, verbatim, per language */}
        <section className="print-avoid-break py-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black border-b border-black/20 pb-1">
            English
          </h2>
          <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-black">
            {en?.content ?? 'Not generated'}
          </pre>
          {!en && (
            <p className="text-[13px] text-black/60">Not generated for this language.</p>
          )}
        </section>

        {hi && (
          <section className="print-avoid-break border-t border-black/20 py-6 print:break-before-page">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black border-b border-black/20 pb-1">
              हिन्दी
            </h2>
            <pre lang="hi" className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-black [font-family:var(--font-noto),var(--font-inter)]">
              {hi.content}
            </pre>
          </section>
        )}

        {/* Footer disclaimer */}
        <footer className="mt-4 border-t border-black/20 pt-3">
          <p className="text-[11px] leading-relaxed text-black/70">
            Generated deterministically from stored data. No estimates. Figures come from public Jal Jeevan
            Mission reporting (ejalshakti.gov.in Har Ghar Jal district reports) as stored in this system.
            Flags indicate data inconsistency, not ground truth.
          </p>
        </footer>
      </article>
    </main>
  );
}
