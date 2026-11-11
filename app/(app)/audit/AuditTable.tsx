'use client';

import { useState } from 'react';
import { Inbox, Webhook, Gauge, FileText, ChevronDown, BadgeCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { CopyText } from '@/components/ui/CodeBlock';
import { cn } from '@/components/ui/cn';

export type AuditRowLite = {
  id: string;
  action: string;
  model: string | null;
  promptVersion: string | null;
  inputHash: string | null;
  outputHash: string | null;
  createdAt: string;
  status?: string;
  llmUsed: boolean;
  extraMeta: Record<string, unknown>;
};

const AGENT: Record<string, { label: string; icon: typeof Inbox }> = {
  ingest_sync: { label: 'Ingest', icon: Webhook },
  anomaly_score: { label: 'Anomaly', icon: Gauge },
  briefing_generate: { label: 'Briefing', icon: FileText },
};

function short(h: string | null) {
  return h ? `${h.slice(0, 10)}…` : '—';
}

function statusTone(status?: string) {
  if (status === 'failed') return 'sev5' as const;
  if (status === 'completed') return 'sev1' as const;
  if (status === 'running') return 'sev3' as const;
  return 'neutral' as const;
}

/** Agent-run timeline table with expandable metadata + click-to-copy hashes. */
export function AuditTable({ rows }: { rows: AuditRowLite[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface">
      {/* Desktop */}
      <div className="hidden md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-subtle">
            <tr>
              {['Time', 'Agent', 'Status', 'Rule / prompt version', 'Input hash', 'Output hash', ''].map((h) => (
                <th key={h} scope="col" className="border-b border-border px-3 py-2.5 text-xs font-medium text-ink-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const agent = AGENT[r.action] ?? { label: r.action, icon: Inbox };
              const AgentIcon = agent.icon;
              const open = expanded.has(r.id);
              return (
                <FragmentRow key={r.id} open={open}>
                  <tr className="border-b border-border last:border-0 hover:bg-subtle">
                    <td className="px-3 py-2.5 whitespace-nowrap align-middle">
                      <span className="text-xs tabular-nums text-ink-secondary">
                        {new Date(r.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <Badge tone="brand">
                        <AgentIcon className="h-3 w-3" aria-hidden="true" />
                        {agent.label}
                      </Badge>
                      {r.llmUsed ? (
                        <Badge className="ml-1.5" title={`LLM: ${r.model ?? 'model'}`}>
                          LLM
                        </Badge>
                      ) : (
                        <Badge className="ml-1.5" tone="sev1" title="Deterministic run — no LLM used (llmUsed: false)">
                          <BadgeCheck className="h-3 w-3" aria-hidden="true" />
                          deterministic
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <Badge tone={statusTone(r.status)}>{r.status ?? '—'}</Badge>
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <code className="font-mono text-xs text-ink-secondary">{r.promptVersion ?? '—'}</code>
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <CopyText text={r.inputHash ?? ''} display={short(r.inputHash)} />
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <CopyText text={r.outputHash ?? ''} display={short(r.outputHash)} />
                    </td>
                    <td className="w-10 px-2 py-2.5 text-right align-middle">
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-label={open ? 'Hide run metadata' : 'Show run metadata'}
                        onClick={() => toggle(r.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-input text-ink-muted transition-colors hover:bg-border/40 hover:text-ink"
                      >
                        <ChevronDown className={cn('h-4 w-4 transition-transform duration-150', open && 'rotate-180')} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                  {open && (
                    <tr aria-label="Run metadata">
                      <td colSpan={7} className="border-b border-border bg-subtle/60 px-3 py-3">
                        <pre className="max-h-56 overflow-auto rounded-input border border-border bg-surface p-3 font-mono text-xs leading-relaxed text-ink-secondary">
                          {JSON.stringify({ action: r.action, model: r.model, promptVersion: r.promptVersion, status: r.status, llmUsed: r.llmUsed, ...r.extraMeta }, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </FragmentRow>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-border md:hidden">
        {rows.map((r) => {
          const agent = AGENT[r.action] ?? { label: r.action, icon: Inbox };
          const open = expanded.has(r.id);
          return (
            <li key={r.id} className="px-4 py-3">
              <button type="button" onClick={() => toggle(r.id)} aria-expanded={open} className="w-full text-left">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone="brand">{agent.label}</Badge>
                  <span className="text-xs tabular-nums text-ink-muted">
                    {new Date(r.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge tone={statusTone(r.status)}>{r.status ?? '—'}</Badge>
                  {!r.llmUsed && (
                    <Badge tone="sev1">
                      <BadgeCheck className="h-3 w-3" aria-hidden="true" />
                      deterministic
                    </Badge>
                  )}
                  {r.llmUsed && <Badge>LLM: {r.model}</Badge>}
                </div>
                <div className="mt-1.5 flex gap-3 text-[11px] text-ink-muted">
                  {r.inputHash && <CopyText text={r.inputHash} display={`in ${short(r.inputHash)}`} />}
                  {r.outputHash && <CopyText text={r.outputHash} display={`out ${short(r.outputHash)}`} />}
                </div>
                <div className="mt-1 text-[11px] text-ink-muted">{open ? 'Hide metadata ▲' : 'Show metadata ▼'}</div>
              </button>
              {open && (
                <pre className="mt-2 max-h-56 overflow-auto rounded-input border border-border bg-subtle p-3 font-mono text-[11px] leading-relaxed text-ink-secondary">
                  {JSON.stringify({ action: r.action, model: r.model, promptVersion: r.promptVersion, status: r.status, ...r.extraMeta }, null, 2)}
                </pre>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FragmentRow({ children, open }: { children: React.ReactNode; open: boolean }) {
  return <>{children}</>;
}
