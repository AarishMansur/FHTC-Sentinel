'use client';

export default function PrintButton({ label = 'Print / Save as PDF' }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex h-9 items-center gap-2 rounded-input bg-brand px-3.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-hover print:hidden"
      type="button"
    >
      {label}
    </button>
  );
}
