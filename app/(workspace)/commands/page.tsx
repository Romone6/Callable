import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { CommandsDataTable } from "@/components/command/commands-data-table";

export default async function CommandsPage() {
  const { organisationId } = await getDevContext();
  const commands = await prisma.actionCommand.findMany({
    where: { organisationId },
    include: {
      app: true,
      executions: { orderBy: { createdAt: "desc" }, take: 20 },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = commands.map((command) => {
    const lastRun = command.executions[0]?.createdAt.toISOString() ?? "No data yet";
    const total = command.executions.length;
    const success = command.executions.filter((execution) => execution.status === "succeeded").length;
    const successRate = total === 0 ? "No data yet" : `${Math.round((success / total) * 100)}%`;

    return {
      id: command.id,
      name: command.name,
      app: command.app?.name ?? "Not connected",
      risk: command.riskLevel,
      status: command.status,
      health: command.healthStatus,
      executionMode: command.executionStrategy,
      lastRun,
      successRate,
    };
  });

  return (
    <>
      <Breadcrumbs current="Commands" />
      <PageHeader label="Commands" title="Command registry" description="Review command status, risk, health, execution mode, and performance using live execution history." />
      {rows.length === 0 ? (
        <EmptyState title="No commands yet" description="Accept a discovery candidate to generate your first command." ctaLabel="Discover commands" ctaHref="/discover-commands" />
      ) : (
        <CommandsDataTable rows={rows} />
      )}
    </>
  );
}

