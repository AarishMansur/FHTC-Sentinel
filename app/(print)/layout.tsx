import { ReactNode } from "react";

/** Bare white shell for the briefing print/A4 view — no sidebar, no chrome. */
export default function PrintLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-white text-ink">{children}</div>;
}
