import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import type { ComplianceResource } from "@/lib/compliance";

export type ComplianceActor = {
  role: string;
};

export async function loadComplianceRows(params: {
  organisationId: string;
  resource: ComplianceResource;
  actor: ComplianceActor;
  from?: Date | null;
  to?: Date | null;
  limit: number;
}) {
  const createdAtFilter = {
    gte: params.from ?? undefined,
    lte: params.to ?? undefined,
  };

  if (params.resource === "audit_logs") {
    requirePermission(params.actor.role, "audit:read");
    const logs = await prisma.auditLog.findMany({
      where: {
        organisationId: params.organisationId,
        createdAt: createdAtFilter,
      },
      orderBy: { createdAt: "desc" },
      take: params.limit,
    });
    return logs.map((log) => ({
      id: log.id,
      organisation_id: log.organisationId,
      event_type: log.eventType,
      actor_type: log.actorType,
      actor_id: log.actorId,
      command_id: log.commandId,
      execution_id: log.executionId,
      details: log.detailsJson,
      created_at: log.createdAt.toISOString(),
    }));
  }

  if (params.resource === "approvals") {
    requirePermission(params.actor.role, "approvals:read");
    const approvals = await prisma.approval.findMany({
      where: {
        organisationId: params.organisationId,
        createdAt: createdAtFilter,
      },
      orderBy: { createdAt: "desc" },
      take: params.limit,
    });
    return approvals.map((approval) => ({
      id: approval.id,
      organisation_id: approval.organisationId,
      execution_id: approval.executionId,
      command_id: approval.commandId,
      requested_by_agent: approval.requestedByAgent,
      reviewer_id: approval.reviewerId,
      status: approval.status,
      reason: approval.reason,
      stage_index: approval.stageIndex,
      stage_name: approval.stageName,
      required_role: approval.requiredRole,
      created_at: approval.createdAt.toISOString(),
      resolved_at: approval.resolvedAt?.toISOString() ?? null,
    }));
  }

  requirePermission(params.actor.role, "executions:read");
  const executions = await prisma.commandExecution.findMany({
    where: {
      organisationId: params.organisationId,
      createdAt: createdAtFilter,
    },
    orderBy: { createdAt: "desc" },
    take: params.limit,
  });
  return executions.map((execution) => ({
    id: execution.id,
    organisation_id: execution.organisationId,
    command_id: execution.commandId,
    agent_name: execution.agentName,
    user_id: execution.userId,
    status: execution.status,
    execution_mode: execution.executionMode,
    approval_status: execution.approvalStatus,
    input: execution.inputJson,
    output: execution.outputJson,
    error_message: execution.errorMessage,
    trace_url: execution.traceUrl,
    started_at: execution.startedAt?.toISOString() ?? null,
    completed_at: execution.completedAt?.toISOString() ?? null,
    created_at: execution.createdAt.toISOString(),
  }));
}
