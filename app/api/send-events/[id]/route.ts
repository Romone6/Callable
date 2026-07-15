import { getDevContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, notFound, ok, serverError } from "@/lib/http";
import { requirePermission } from "@/lib/permissions";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organisationId, user } = await getDevContext();
    requirePermission(user.role, "executions:read");
    requirePermission(user.role, "approvals:read");

    const { id } = await params;
    const sendEvent = await prisma.sendEvent.findFirst({
      where: {
        id,
        organisationId,
      },
    });

    if (!sendEvent) {
      return notFound("Send event not found");
    }

    return ok({
      send_event: {
        id: sendEvent.id,
        source: sendEvent.source,
        decision_status: sendEvent.decisionStatus,
        decision_snapshot: sendEvent.decisionSnapshotJson,
        reviewer_state: sendEvent.reviewerStateJson,
        risk_state: sendEvent.riskStateJson,
        connector_target: sendEvent.connectorTargetJson,
        delivery_state: sendEvent.deliveryState,
        delivery_confirmation: sendEvent.deliveryConfirmationJson,
        command_id: sendEvent.commandId,
        execution_id: sendEvent.executionId,
        approval_policy_id: sendEvent.approvalPolicyId,
        created_by: sendEvent.createdBy,
        created_at: sendEvent.createdAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}
