import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { DiscoveryRunPanel } from "@/components/discovery/discovery-run-panel";
import { CandidateWorkflowCard } from "@/components/discovery/candidate-workflow-card";
import { EmptyState } from "@/components/shared/empty-state";

export default async function DiscoverCommandsPage() {
  const { organisationId } = await getDevContext();
  const [apps, sources, candidates] = await Promise.all([
    prisma.app.findMany({ where: { organisationId }, orderBy: { createdAt: "desc" } }),
    prisma.discoverySource.findMany({ where: { organisationId }, orderBy: { createdAt: "desc" } }),
    prisma.workflowCandidate.findMany({ where: { organisationId }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <>
      <Breadcrumbs current="Discover Commands" />
      <PageHeader
        label="Discover Commands"
        title="Run discovery and review candidate workflows"
        description="If model-provider credentials are missing, discovery returns a real configuration error and no candidates are fabricated."
      />
      <div className="grid gap-4 md:grid-cols-[420px_1fr]">
        <DiscoveryRunPanel
          apps={apps.map((app) => ({ id: app.id, name: app.name }))}
          sources={sources.map((source) => ({ id: source.id, name: source.name, type: source.type }))}
        />
        <section className="grid gap-3">
          {candidates.length === 0 ? (
            <EmptyState
              title="No candidate workflows found"
              description="No candidate workflows found from the selected sources."
            />
          ) : (
            candidates.map((candidate) => (
              <CandidateWorkflowCard
                key={candidate.id}
                candidate={{
                  id: candidate.id,
                  name: candidate.name,
                  description: candidate.description,
                  confidence: candidate.confidence,
                  riskLevel: candidate.riskLevel,
                  status: candidate.status,
                  requiredInputsJson: candidate.requiredInputsJson,
                  expectedOutputsJson: candidate.expectedOutputsJson,
                  sourceEvidenceJson: candidate.sourceEvidenceJson,
                }}
              />
            ))
          )}
        </section>
      </div>
    </>
  );
}

