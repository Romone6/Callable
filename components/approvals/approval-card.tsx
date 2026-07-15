"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { getApiErrorMessage } from "@/lib/utils/api-error";

export function ApprovalCard({
  approval,
}: {
  approval: {
    id: string;
    status: string;
    reason: string;
    commandName: string;
    executionId: string;
    requestedByAgent: string;
    reviewerId: string | null;
    createdAt: string;
    resolvedAt: string | null;
  };
}) {
  const router = useRouter();

  async function approve() {
    const response = await fetch(`/api/approvals/${approval.id}/approve`, { method: "POST" });
    const json = await response.json();
    if (!response.ok) {
      toast.error(getApiErrorMessage(json, "Unable to approve"));
      return;
    }
    toast.success("Approval completed");
    router.refresh();
  }

  async function reject() {
    const response = await fetch(`/api/approvals/${approval.id}/reject`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: "Rejected in approval queue" }),
    });
    const json = await response.json();
    if (!response.ok) {
      toast.error(getApiErrorMessage(json, "Unable to reject"));
      return;
    }
    toast.success("Approval rejected");
    router.refresh();
  }

  return (
    <Card className="grid gap-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">{approval.commandName}</h4>
        <StatusBadge value={approval.status} />
      </div>
      <p className="text-sm text-[var(--muted-text)]">Reason: {approval.reason}</p>
      <p className="text-xs text-[var(--muted-text)]">Execution: {approval.executionId}</p>
      <p className="text-xs text-[var(--muted-text)]">Requested by: {approval.requestedByAgent}</p>
      <p className="text-xs text-[var(--muted-text)]">Created: {approval.createdAt}</p>
      <p className="text-xs text-[var(--muted-text)]">Resolved: {approval.resolvedAt ?? "Not resolved"}</p>
      <p className="text-xs text-[var(--muted-text)]">Reviewer: {approval.reviewerId ?? "Not reviewed"}</p>
      {approval.status === "pending" ? (
        <div className="flex gap-2">
          <Button type="button" onClick={approve}>Approve</Button>
          <Button type="button" variant="secondary" onClick={reject}>Reject</Button>
        </div>
      ) : null}
    </Card>
  );
}
