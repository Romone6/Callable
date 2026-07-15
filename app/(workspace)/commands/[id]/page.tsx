import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { CommandSchemaEditor } from "@/components/command/command-schema-editor";
import { CommandTestConsole } from "@/components/command/command-test-console";

export default async function CommandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { organisationId } = await getDevContext();
  const { id } = await params;

  const command = await prisma.actionCommand.findFirst({
    where: { id, organisationId },
    include: {
      app: true,
      steps: { orderBy: { stepIndex: "asc" } },
      executions: { orderBy: { createdAt: "desc" }, take: 10 },
      drifts: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!command) {
    notFound();
  }

  return (
    <>
      <Breadcrumbs current={`Commands / ${command.name}`} />
      <PageHeader label="Command Detail" title={command.name} description={command.description} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="text-lg font-semibold">Command metadata</h3>
          <div className="mt-3 grid gap-2 text-sm text-[var(--muted-text)]">
            <p>App: {command.app?.name ?? "Not connected"}</p>
            <p>Risk: {command.riskLevel}</p>
            <p>Status: <StatusBadge value={command.status} /></p>
            <p>Health: <StatusBadge value={command.healthStatus} /></p>
            <p>Execution strategy: {command.executionStrategy}</p>
            <p>Success condition: {command.successCondition}</p>
          </div>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold">Execution steps</h3>
          <div className="mt-3 grid gap-2 text-sm">
            {command.steps.map((step) => (
              <div key={step.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="font-semibold">Step {step.stepIndex + 1} · {step.stepType}</p>
                <p className="text-[var(--muted-text)]">Route: {step.apiRoute ?? "Unavailable"}</p>
                <p className="text-[var(--muted-text)]">Selector: {step.selector ?? "Unavailable"}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <CommandSchemaEditor
        commandId={command.id}
        inputSchema={command.inputSchemaJson}
        outputSchema={command.outputSchemaJson}
        approvalRules={command.approvalRulesJson}
      />
      <CommandTestConsole commandId={command.id} commandName={command.name} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="text-lg font-semibold">Recent executions</h3>
          <pre className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-3 text-xs">{JSON.stringify(command.executions, null, 2)}</pre>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold">Source evidence</h3>
          <pre className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-3 text-xs">{JSON.stringify(command.sourceEvidenceJson, null, 2)}</pre>
        </Card>
      </div>
      <Card>
        <h3 className="text-lg font-semibold">Drift health</h3>
        <pre className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-3 text-xs">{JSON.stringify(command.drifts, null, 2)}</pre>
      </Card>
    </>
  );
}

