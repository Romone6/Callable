import { ApprovalStatus, ExecutionStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { badRequest, forbidden, ok, serverError } from "@/lib/http";
import { createApprovalSchema } from "@/lib/schemas";
import { writeAuditLog } from "@/lib/audit";
import { requirePermission } from "@/lib/permissions";

export async function GET() {
  try {
    const { organisationId, user } = await getDevContext();
    requirePermission(user.role, "approvals:read");
    const approvals = await prisma.approval.findMany({
      where: { organisationId },
      include: { execution: true, command: true },
      orderBy: { createdAt: "desc" },
    });

    return ok({ approvals });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { organisationId, userId, user } = await getDevContext();
    requirePermission(user.role, "approvals:request");
    const parsed = createApprovalSchema.safeParse(await request.json());
    if (!parsed.success) {
      return badRequest("Invalid approval payload", parsed.error.flatten());
    }

    const execution = await prisma.commandExecution.findFirst({
      where: { id: parsed.data.execution_id, organisationId },
      include: { command: true },
    });

    if (!execution) {
      return badRequest("Execution not found for this organisation");
    }

    if (new Set<ExecutionStatus>([ExecutionStatus.succeeded, ExecutionStatus.failed, ExecutionStatus.cancelled]).has(execution.status)) {
      return badRequest(`Cannot request approval for execution in status ${execution.status}`);
    }

    const existing = await prisma.approval.findFirst({
      where: {
        organisationId,
        executionId: execution.id,
        status: ApprovalStatus.pending,
      },
    });

    if (existing) {
      return ok({ approval: existing, reused: true });
    }

    const approval = await prisma.approval.create({
      data: {
        organisationId,
        executionId: execution.id,
        commandId: execution.commandId,
        requestedByAgent: parsed.data.requested_by_agent,
        reason: parsed.data.reason,
        status: ApprovalStatus.pending,
      },
    });

    await prisma.commandExecution.update({
      where: { id: execution.id },
      data: {
        status: ExecutionStatus.waiting_for_approval,
        approvalStatus: ApprovalStatus.pending,
      },
    });

    await writeAuditLog({
      organisationId,
      eventType: "approval_requested",
      actorType: "user",
      actorId: userId,
      commandId: execution.commandId,
      executionId: execution.id,
      details: {
        approval_id: approval.id,
        reason: approval.reason,
        requested_by_agent: approval.requestedByAgent,
      },
    });

    return ok({ approval }, 201);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}
