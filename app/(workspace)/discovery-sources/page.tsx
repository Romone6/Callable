import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { SourceUploadForm } from "@/components/discovery/source-upload-form";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";

export default async function DiscoverySourcesPage() {
  const { organisationId } = await getDevContext();
  const [apps, sources] = await Promise.all([
    prisma.app.findMany({ where: { organisationId }, orderBy: { createdAt: "desc" } }),
    prisma.discoverySource.findMany({ where: { organisationId }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <>
      <Breadcrumbs current="Discovery Sources" />
      <PageHeader label="Discovery Sources" title="Upload real workflow evidence" description="Supported types: SOP/process docs, CSV ticket export, JSON trace, OpenAPI schema, Playwright trace, manual process text." />
      <div className="grid gap-4 md:grid-cols-[420px_1fr]">
        <SourceUploadForm apps={apps.map((app) => ({ id: app.id, name: app.name }))} />
        <Card>
          <h3 className="text-lg font-semibold">Uploaded sources</h3>
          {sources.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="No sources uploaded" description="Upload source evidence to start workflow discovery." />
            </div>
          ) : (
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr>
                  <th className="border-b border-white/10 px-2 py-2 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-text)]">Name</th>
                  <th className="border-b border-white/10 px-2 py-2 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-text)]">Type</th>
                  <th className="border-b border-white/10 px-2 py-2 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-text)]">Status</th>
                  <th className="border-b border-white/10 px-2 py-2 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-text)]">Error</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => (
                  <tr key={source.id}>
                    <td className="border-b border-white/10 px-2 py-3">{source.name}</td>
                    <td className="border-b border-white/10 px-2 py-3">{source.type}</td>
                    <td className="border-b border-white/10 px-2 py-3"><StatusBadge value={source.status} /></td>
                    <td className="border-b border-white/10 px-2 py-3 text-xs text-[var(--muted-text)]">{source.errorMessage ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}

