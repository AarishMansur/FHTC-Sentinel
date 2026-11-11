import prisma, { withRetry } from '@/lib/prisma';
import { PageHeader } from '@/components/ui/PageHeader';
import { AuditTable, type AuditRowLite } from './AuditTable';
import SourceChip from '@/components/ui/SourceChip';
import { ScrollText } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';

export default async function AuditPage() {
  const { logs, lastSync } = await withRetry(async () => {
    const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
    const lastSync = await prisma.auditLog.findFirst({ where: { action: 'ingest_sync' }, orderBy: { createdAt: 'desc' } });
    return { logs, lastSync };
  });

  const rows: AuditRowLite[] = logs.map((l) => {
    const m = (l.metadata && typeof l.metadata === 'object' ? l.metadata : {}) as Record<string, unknown>;
    const { status: _status, ...rest } = m;
    return {
      id: l.id,
      action: l.action,
      model: l.model ?? null,
      promptVersion: l.promptVersion ?? null,
      inputHash: l.inputHash ?? null,
      outputHash: l.outputHash ?? null,
      createdAt: l.createdAt.toISOString(),
      status: typeof m.status === 'string' ? m.status : undefined,
      llmUsed: m.llmUsed === true,
      extraMeta: rest,
    };
  });

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Audit log' }]}
        title="Audit log"
        meta={<SourceChip source="Agent run ledger (last 200)" lastSync={lastSync?.createdAt ?? null} fallback={!lastSync} />}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<ScrollText className="h-8 w-8" aria-hidden="true" />}
          title="No audit entries yet"
          description="Agent runs (ingest, scoring, briefings) appear here with their deterministic hashes."
        />
      ) : (
        <AuditTable rows={rows} />
      )}
    </div>
  );
}
