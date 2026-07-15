import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { AddAppForm, TestConnectionButton } from "@/components/app-shell/add-app-form";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import { asMetadataRecord, metadataString, resolveProviderKeyFromMetadata } from "@/lib/connectors/metadata";

export default async function AppsPage() {
  const { organisationId } = await getDevContext();
  const apps = await prisma.app.findMany({ where: { organisationId }, orderBy: { createdAt: "desc" } });

  return (
    <>
      <Breadcrumbs current="Apps" />
      <PageHeader label="Apps" title="Connect target software" description="Register real target systems and test live connectivity. Unsupported integrations should remain Not connected or Coming soon." />
      <div className="grid gap-4 md:grid-cols-[420px_1fr]">
        <AddAppForm />
        <Card>
          <h3 className="text-lg font-semibold">Connected apps</h3>
          {apps.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="No apps connected" description="Create your first app connector to begin discovery and command generation." />
            </div>
          ) : (
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr>
                  <th className="border-b border-white/10 px-2 py-2 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-text)]">Name</th>
                  <th className="border-b border-white/10 px-2 py-2 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-text)]">Provider</th>
                  <th className="border-b border-white/10 px-2 py-2 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-text)]">Base URL</th>
                  <th className="border-b border-white/10 px-2 py-2 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-text)]">Status</th>
                  <th className="border-b border-white/10 px-2 py-2 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-text)]">Last error</th>
                  <th className="border-b border-white/10 px-2 py-2 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-text)]">Action</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((app) => {
                  const metadata = asMetadataRecord(app.metadataJson);
                  const provider = resolveProviderKeyFromMetadata(app.type, app.metadataJson);
                  const lastError = metadataString(metadata, "last_connection_error");

                  return (
                    <tr key={app.id}>
                      <td className="border-b border-white/10 px-2 py-3">{app.name}</td>
                      <td className="border-b border-white/10 px-2 py-3">{provider}</td>
                      <td className="border-b border-white/10 px-2 py-3">{app.baseUrl}</td>
                      <td className="border-b border-white/10 px-2 py-3"><StatusBadge value={app.connectionStatus} /></td>
                      <td className="border-b border-white/10 px-2 py-3 text-xs text-[var(--muted-text)]">{lastError ?? "-"}</td>
                      <td className="border-b border-white/10 px-2 py-3"><TestConnectionButton appId={app.id} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}
