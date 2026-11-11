'use client';

import { useState } from 'react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

/**
 * Latest stored briefing preview with an EN / हिंदी toggle.
 * Both languages arrive from the server (stored Briefing rows); content is
 * rendered read-only — generation happens on the briefing page.
 */
export function BriefingPreview({ en, hi, districtId }: { en?: string | null; hi?: string | null; districtId: string }) {
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  if (!en && !hi) return null;

  const content = lang === 'hi' ? hi ?? en : en ?? hi;

  return (
    <div className="border-t border-border p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-ink">Latest briefing</h4>
        <SegmentedControl
          ariaLabel="Briefing language"
          value={lang}
          onChange={setLang}
          options={[
            { value: 'en', label: 'EN' },
            { value: 'hi', label: 'हिन्दी' },
          ]}
        />
      </div>
      <p className="max-h-40 overflow-hidden whitespace-pre-wrap text-xs leading-relaxed text-ink-secondary">
        {content}
      </p>
      <a
        href={`/district/${districtId}/briefing`}
        className="mt-2 inline-block text-xs font-medium text-brand transition-colors hover:text-brand-hover"
      >
        Open full briefing →
      </a>
    </div>
  );
}
