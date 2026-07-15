import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ExecutionsDataTable } from "@/components/execution/executions-data-table";

export default async function ExecutionsPage() {
  const { organisationId } = await getDevContext();
  const executions = await prisma.commandExecution.findMany({
    where: { organisationId },
    include: { command: true },
    orderBy: { createdAt: "desc" },
  });

  const rows = executions.map((execution) => ({
    id: execution.id,
    command: execution.command.name,
    status: execution.status,
    input: JSON.stringify(execution.inputJson),
    output: execution.outputJson ? JSON.stringify(execution.outputJson) : "-",
    error: execution.errorMessage ?? "-",
    mode: execution.executionMode,
    duration:
      execution.startedAt && execution.completedAt
        ? `${Math.max(0, execution.completedAt.getTime() - execution.startedAt.getTime())} ms`
        : "No data yet",
  }));

  return (
    <>
      <Breadcrumbs current="Executions" />
      <PageHeader label="Executions" title="Command execution history" description="Track real execution status, output, errors, and duration." />
      {rows.length === 0 ? (
        <EmptyState title="No executions" description="Run a published command to create execution history." ctaLabel="Open Commands" ctaHref="/commands" />
      ) : (
        <ExecutionsDataTable rows={rows} />
      )}
    </>
  );
}

