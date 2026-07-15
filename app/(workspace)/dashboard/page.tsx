import Link from "next/link";
import { startOfDay } from "@/lib/time";
import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { MetricCard } from "@/components/shared/metric-card";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ExecutionSummaryChart } from "@/components/execution/execution-summary-chart";

const dateTimeFormatter = new Intl.DateTimeFormat("en-AU", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function DashboardPage() {
  const { organisationId } = await getDevContext();
  const dayStart = startOfDay(new Date());

  const [apps, sources, candidates, publishedCommands, executionsToday, successfulToday, failedToday, waitingToday, pendingApprovals, driftWarnings, recentExecutions] =
    await Promise.all([
      prisma.app.count({ where: { organisationId, connectionStatus: "connected" } }),
      prisma.discoverySource.count({ where: { organisationId } }),
      prisma.workflowCandidate.count({ where: { organisationId } }),
      prisma.actionCommand.count({ where: { organisationId, status: "published" } }),
      prisma.commandExecution.count({ where: { organisationId, createdAt: { gte: dayStart } } }),
      prisma.commandExecution.count({ where: { organisationId, createdAt: { gte: dayStart }, status: "succeeded" } }),
      prisma.commandExecution.count({ where: { organisationId, createdAt: { gte: dayStart }, status: "failed" } }),
      prisma.commandExecution.count({ where: { organisationId, createdAt: { gte: dayStart }, status: "waiting_for_approval" } }),
      prisma.approval.count({ where: { organisationId, status: "pending" } }),
      prisma.driftCheck.count({ where: { organisationId, status: { in: ["warning", "broken"] } } }),
      prisma.commandExecution.findMany({ where: { organisationId }, include: { command: true }, orderBy: { createdAt: "desc" }, take: 5 }),
    ]);

  const successRate = executionsToday === 0 ? "No data yet" : `${Math.round((successfulToday / executionsToday) * 100)}%`;

  return (
    <>
      <Breadcrumbs current="Dashboard" />
      <PageHeader
        label="Dashboard"
        title="Operational command layer status"
        description="All metrics are live from persisted workspace data. No synthetic statistics are shown."
      />
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard label="Connected apps" value={apps} />
        <MetricCard label="Discovery sources" value={sources} />
        <MetricCard label="Workflow candidates" value={candidates} />
        <MetricCard label="Published commands" value={publishedCommands} />
        <MetricCard label="Executions today" value={executionsToday} />
        <MetricCard label="Success rate" value={successRate} />
        <MetricCard label="Pending approvals" value={pendingApprovals} />
        <MetricCard label="Drift warnings" value={driftWarnings} />
      </div>
      <Card>
        <h3 className="text-xl font-semibold">Execution status today</h3>
        <ExecutionSummaryChart succeeded={successfulToday} failed={failedToday} waiting={waitingToday} />
      </Card>
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xl font-semibold">Recent executions</h3>
          <Link href="/executions" className="text-sm text-lime-200 hover:underline">View all</Link>
        </div>
        {recentExecutions.length === 0 ? (
          <EmptyState title="No execution activity yet" description="Run a published command to populate execution history." ctaLabel="Open Commands" ctaHref="/commands" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="border-b border-white/10 px-2 py-2 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-text)]">Command</th>
                <th className="border-b border-white/10 px-2 py-2 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-text)]">Status</th>
                <th className="border-b border-white/10 px-2 py-2 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-text)]">Created</th>
              </tr>
            </thead>
            <tbody>
              {recentExecutions.map((execution) => (
                <tr key={execution.id}>
                  <td className="border-b border-white/10 px-2 py-3">{execution.command.name}</td>
                  <td className="border-b border-white/10 px-2 py-3">{execution.status}</td>
                  <td className="border-b border-white/10 px-2 py-3">{dateTimeFormatter.format(execution.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
