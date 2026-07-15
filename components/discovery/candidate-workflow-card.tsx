"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { getApiErrorMessage } from "@/lib/utils/api-error";

export function CandidateWorkflowCard({
  candidate,
}: {
  candidate: {
    id: string;
    name: string;
    description: string;
    confidence: number;
    riskLevel: string;
    status: string;
    requiredInputsJson: unknown;
    expectedOutputsJson: unknown;
    sourceEvidenceJson: unknown;
  };
}) {
  const router = useRouter();

  async function accept() {
    const response = await fetch(`/api/discovery/candidates/${candidate.id}/accept`, { method: "POST" });
    const json = await response.json();
    if (!response.ok) {
      toast.error(getApiErrorMessage(json, "Failed to accept candidate"));
      return;
    }
    const generated = await fetch(`/api/discovery/candidates/${candidate.id}/generate-command`, { method: "POST" });
    const generatedJson = await generated.json();
    if (!generated.ok) {
      toast.error(getApiErrorMessage(generatedJson, "Failed to generate command"));
      return;
    }
    toast.success("Candidate accepted and command generated");
    router.refresh();
  }

  async function reject() {
    const response = await fetch(`/api/discovery/candidates/${candidate.id}/reject`, { method: "POST" });
    const json = await response.json();
    if (!response.ok) {
      toast.error(getApiErrorMessage(json, "Failed to reject candidate"));
      return;
    }
    toast.success("Candidate rejected");
    router.refresh();
  }

  return (
    <Card className="grid gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-lg font-semibold">{candidate.name}</h4>
          <p className="text-sm text-[var(--muted-text)]">{candidate.description}</p>
        </div>
        <StatusBadge value={candidate.status} />
      </div>
      <div className="grid gap-2 text-sm md:grid-cols-2">
        <p>Confidence: <strong>{candidate.confidence.toFixed(2)}</strong></p>
        <p>Risk: <strong>{candidate.riskLevel}</strong></p>
        <p className="md:col-span-2">Inputs: <code>{JSON.stringify(candidate.requiredInputsJson)}</code></p>
        <p className="md:col-span-2">Outputs: <code>{JSON.stringify(candidate.expectedOutputsJson)}</code></p>
        <p className="md:col-span-2">Evidence: <code>{JSON.stringify(candidate.sourceEvidenceJson)}</code></p>
      </div>
      {candidate.status === "accepted" ? null : (
        <div className="flex gap-2">
          <Button type="button" onClick={accept}>Accept + generate command</Button>
          <Button type="button" variant="secondary" onClick={reject}>Reject</Button>
        </div>
      )}
    </Card>
  );
}
