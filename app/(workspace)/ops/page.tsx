import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { QueueTriagePanel } from "@/components/ops/queue-triage-panel";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { getDevContext } from "@/lib/auth";
import { requirePermission, requireRole } from "@/lib/permissions";

export default async function OpsPage() {
  const { user } = await getDevContext();
  requirePermission(user.role, "executions:read");
  requirePermission(user.role, "drift:read");
  requireRole(user.role, ["owner", "admin", "operator", "reviewer"]);

  const canManage = user.role === "owner" || user.role === "admin" || user.role === "operator";

  return (
    <>
      <Breadcrumbs current="Ops" />
      <PageHeader
        label="Operations"
        title="Queue triage and recovery"
        description="Review failed jobs, replay recoverable work, and acknowledge triaged failures with audit visibility."
      />
      <QueueTriagePanel canManage={canManage} />
      <Card>
        <h3 className="text-lg font-semibold">Operational controls</h3>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--muted-text)]">
          <li>Replay retries failed jobs through existing queue logic.</li>
          <li>Acknowledge removes triaged failed jobs and writes an audit event.</li>
          <li>Reviewer role remains read-only for queue triage actions.</li>
        </ul>
      </Card>
    </>
  );
}
