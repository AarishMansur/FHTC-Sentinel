'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { LogoMark } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { cn } from '@/components/ui/cn';

const DEMO_ACCOUNTS = [
  { email: 'collector@ajmer.gov.in', label: 'Collector, Ajmer' },
  { email: 'collector@jaipur.gov.in', label: 'Collector, Jaipur' },
  { email: 'state@jjm.gov.in', label: 'State JJM Cell' },
  { email: 'viewer@demo.gov.in', label: 'Viewer' },
];

/** Login form. Auth behavior is unchanged: POST /api/auth/login, then redirect. */
export default function LoginForm({ showDemo }: { showDemo: boolean }) {
  const [email, setEmail] = useState('collector@ajmer.gov.in');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'login_failed');
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'login_failed');
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="rounded-panel border border-border bg-surface p-6">
        <div className="mb-5 text-center">
          <LogoMark className="mx-auto h-10 w-10" />
          <h1 className="mt-3 text-lg font-semibold tracking-tight text-ink">
            FHTC <span className="text-brand">Sentinel</span>
          </h1>
          <p className="mt-1 text-xs text-ink-muted">Jal Jeevan Mission field-verification console</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-input border border-danger/25 bg-danger-soft px-3 py-2 text-xs text-danger">
              {error === 'invalid_credentials' ? 'Wrong email or password.' : error}
            </p>
          )}

          <Button type="submit" loading={loading} size="lg" className="w-full">
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        {showDemo && (
          <details className="group mt-4 rounded-card border border-border bg-subtle [&_svg]:open:rotate-180">
            <summary className="flex cursor-pointer min-h-11 list-none items-center justify-between rounded-card px-3 text-sm font-medium text-ink-secondary marker:hidden [&::-webkit-details-marker]:hidden">
              Demo accounts
              <ChevronDown className="h-4 w-4 transition-transform duration-150" aria-hidden="true" />
            </summary>
            <ul className="space-y-1.5 border-t border-border px-3 pb-3 pt-2.5 text-xs">
              {DEMO_ACCOUNTS.map((a) => (
                <li key={a.email} className="flex items-center justify-between gap-3">
                  <code className="font-mono text-ink-secondary">{a.email}</code>
                  <span className="text-ink-muted">{a.label}</span>
                </li>
              ))}
              <li className="pt-1 text-ink-muted">
                Password: <code className="font-mono">demo123</code>
              </li>
            </ul>
          </details>
        )}
      </div>

      <p className="mt-6 text-center text-xs leading-relaxed text-ink-muted">
        Government-facing. Flags indicate data inconsistency, not ground truth.
      </p>
      <p className={cn('mt-2 text-center text-xs')}>
        <Link href="/" className="text-ink-muted transition-colors duration-150 hover:text-ink">
          Back to home
        </Link>
      </p>
    </div>
  );
}
