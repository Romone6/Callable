import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { AuditLogTable } from "@/components/audit/audit-log-table";
import { Card } from "@/components/ui/card";

export default async function AuditLogsPage() {
  const { organisationId } = await getDevContext();
  const logs = await prisma.auditLog.findMany({
    where: { organisationId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const rows = logs.map((log) => ({
    id: log.id,
    eventType: log.eventType,
    actor: `${log.actorType}:${log.actorId ?? "-"}`,
    command: log.commandId ?? "-",
    execution: log.executionId ?? "-",
    createdAt: log.createdAt.toISOString(),
  }));

  return (
    <>
      <Breadcrumbs current="Audit Logs" />
      <PageHeader label="Audit Logs" title="Event-driven audit history" description="Audit rows are created only from real operations." />
      {rows.length === 0 ? (
        <EmptyState title="No audit logs" description="Run discovery, command generation, or executions to create audit entries." />
      ) : (
        <AuditLogTable rows={rows} />
      )}
      {logs.length > 0 ? (
        <Card>
          <h3 className="text-lg font-semibold">Latest audit details</h3>
          <pre className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-3 text-xs">{JSON.stringify(logs[0], null, 2)}</pre>
        </Card>
      ) : null}
    </>
  );
}

