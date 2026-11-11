'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Printer } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Card, CardHeader } from '@/components/ui/Card';

/**
 * Collector briefing (web view). Generation behavior unchanged:
 * POST /api/briefing with the districtId; stored briefings are shown as-is.
 */
export default function BriefingPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [user, setUser] = useState<{ role?: string; state?: string; district?: string | null } | null>(null);
  const [briefing, setBriefing] = useState<{ en: string; hi: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lang, setLang] = useState<'en' | 'hi'>('en');

  useEffect(() => {
    fetch('/api/auth/whoami')
      .then((r) => r.json())
      .then((d) => (d.ok ? setUser(d.user) : null))
      .catch(() => {});
  }, []);

  async function generate() {
    setLoading(true);
    setError('');
    setBriefing(null);
    try {
      const res = await fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ districtId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'briefing_failed');
      setBriefing(data.briefing);
      setLang('en');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'briefing_failed');
    } finally {
      setLoading(false);
    }
  }

  const canGenerate = user && (user.role === 'state_admin' || user.role === 'collector');

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Briefing' },
        ]}
        title="Collector briefing"
        action={
          <>
            <Link
              href={`/district/${id}/briefing/print`}
              hidden={!briefing}
              aria-hidden={!briefing}
              onClick={(e) => !briefing && e.preventDefault()}
              className={`inline-flex h-11 items-center gap-2 rounded-input border border-border bg-surface px-3.5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-subtle md:h-9 ${!briefing ? 'pointer-events-none opacity-40' : ''}`}
            >
              <Printer className="h-4 w-4 text-ink-secondary" aria-hidden="true" />
              Print view
            </Link>
            <Button onClick={generate} loading={loading} disabled={!canGenerate}>
              {loading ? 'Generating…' : 'Generate briefing'}
            </Button>
          </>
        }
      />

      {!canGenerate && !user && (
        <p className="mb-3 rounded-card border border-border bg-surface p-3 text-sm text-ink-secondary">
          Sign in as a Collector or State JJM Cell account to generate briefings.
        </p>
      )}
      {!canGenerate && user && (
        <p className="mb-3 rounded-card border border-border bg-surface p-3 text-sm text-ink-secondary">
          Your account role cannot generate briefings.
        </p>
      )}
      {error && (
        <p role="alert" className="mb-3 rounded-card border border-danger/25 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {briefing && (
        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <SegmentedControl
              ariaLabel="Briefing language"
              value={lang}
              onChange={setLang}
              options={[
                { value: 'en', label: 'English' },
                { value: 'hi', label: 'हिन्दी' },
              ]}
            />
            <p className="text-xs text-ink-muted">Generated deterministically from stored data. No estimates.</p>
          </div>

          <Card>
            <CardHeader
              title={lang === 'en' ? 'English briefing' : 'हिन्दी ब्रीफिंग'}
              description="Deterministic template — identical inputs produce identical output."
            />
            <div className="p-4">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink">{briefing[lang]}</pre>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
