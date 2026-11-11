'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from './cn';

/** Pre-formatted code/JSON with a click-to-copy action. Mono, muted syntax. */
export function CodeBlock({ code, className, copyText }: { code: string; className?: string; copyText?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(copyText ?? code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — leave the text selectable */
    }
  }

  return (
    <div className={cn('group relative overflow-hidden rounded-input border border-border bg-subtle', className)}>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? 'Copied' : 'Copy code'}
        className="absolute right-1.5 top-1.5 rounded-input border border-border bg-surface p-1.5 text-ink-secondary opacity-80 transition-[opacity,color] group-hover:opacity-100 hover:text-ink"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
      </button>
      <pre className="max-h-64 overflow-auto p-3 pr-10 font-mono text-xs leading-relaxed text-ink-secondary">{code}</pre>
    </div>
  );
}

/** Click-to-copy for truncated hashes and district codes. */
export function CopyText({ text, display, className = 'font-mono text-xs' }: { text: string; display?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        } catch {
          /* noop */
        }
      }}
      title={`${display ?? text} — click to copy`}
      className={cn(
        'inline-flex items-center gap-1 rounded-input px-1 py-0.5 text-left transition-colors duration-150 hover:bg-subtle',
        copied ? 'text-success' : 'text-ink-secondary',
        className
      )}
    >
      <span className="tabular-nums">{copied ? 'copied ✓' : display ?? text}</span>
    </button>
  );
}
