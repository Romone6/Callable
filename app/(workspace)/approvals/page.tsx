import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ApprovalCard } from "@/components/approvals/approval-card";
import { Card } from "@/components/ui/card";

export default async function ApprovalsPage() {
  const { organisationId } = await getDevContext();
  const approvals = await prisma.approval.findMany({
    where: { organisationId },
    include: { command: true, execution: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <Breadcrumbs current="Approvals" />
      <PageHeader label="Approvals" title="Approval queue" description="High-risk executions wait here until approved or rejected." />
      {approvals.length === 0 ? (
        <EmptyState title="No pending approvals" description="Approval-required executions will appear here." />
      ) : (
        <div className="grid gap-3">
          {approvals.map((approval) => (
            <ApprovalCard
              key={approval.id}
              approval={{
                id: approval.id,
                status: approval.status,
                reason: approval.reason,
                commandName: approval.command.name,
                executionId: approval.execution.id,
                requestedByAgent: approval.requestedByAgent,
                reviewerId: approval.reviewerId,
                createdAt: approval.createdAt.toISOString(),
                resolvedAt: approval.resolvedAt?.toISOString() ?? null,
              }}
            />
          ))}
        </div>
      )}

      {approvals.length > 0 ? (
        <Card>
          <h3 className="text-lg font-semibold">Approval history</h3>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr>
                <th className="border-b border-white/10 px-2 py-2 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-text)]">Command</th>
                <th className="border-b border-white/10 px-2 py-2 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-text)]">Status</th>
                <th className="border-b border-white/10 px-2 py-2 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-text)]">Reviewer</th>
                <th className="border-b border-white/10 px-2 py-2 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-text)]">Resolved</th>
              </tr>
            </thead>
            <tbody>
              {approvals.map((approval) => (
                <tr key={`history-${approval.id}`}>
                  <td className="border-b border-white/10 px-2 py-3">{approval.command.name}</td>
                  <td className="border-b border-white/10 px-2 py-3">{approval.status}</td>
                  <td className="border-b border-white/10 px-2 py-3">{approval.reviewerId ?? "-"}</td>
                  <td className="border-b border-white/10 px-2 py-3">{approval.resolvedAt?.toISOString() ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}
    </>
  );
}
