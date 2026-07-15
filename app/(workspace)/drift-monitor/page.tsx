import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { DriftCheckCard } from "@/components/drift/drift-check-card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";

export default async function DriftMonitorPage() {
  const { organisationId } = await getDevContext();
  const [commands, checks] = await Promise.all([
    prisma.actionCommand.findMany({ where: { organisationId }, orderBy: { createdAt: "desc" } }),
    prisma.driftCheck.findMany({ where: { organisationId }, include: { command: true }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <>
      <Breadcrumbs current="Drift Monitor" />
      <PageHeader label="Drift Monitor" title="Command health checks" description="Health state is updated only from real drift checks." />
      <DriftCheckCard commands={commands.map((command) => ({ id: command.id, name: command.name }))} />
      <Card>
        <h3 className="text-lg font-semibold">Drift check history</h3>
        {checks.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No drift checks" description="Run a drift check for one or more commands." />
          </div>
        ) : (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr>
                <th className="border-b border-white/10 px-2 py-2 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-text)]">Command</th>
                <th className="border-b border-white/10 px-2 py-2 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-text)]">Status</th>
                <th className="border-b border-white/10 px-2 py-2 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-text)]">Severity</th>
                <th className="border-b border-white/10 px-2 py-2 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-text)]">Issue</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((check) => (
                <tr key={check.id}>
                  <td className="border-b border-white/10 px-2 py-3">{check.command.name}</td>
                  <td className="border-b border-white/10 px-2 py-3"><StatusBadge value={check.status} /></td>
                  <td className="border-b border-white/10 px-2 py-3">{check.severity}</td>
                  <td className="border-b border-white/10 px-2 py-3 text-[var(--muted-text)]">{check.issueDescription}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}

