import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { badRequest, forbidden, ok, serverError } from "@/lib/http";
import { writeAuditLog } from "@/lib/audit";
import { requirePermission, requireRole } from "@/lib/permissions";
import { getEffectiveRetentionPolicy } from "@/lib/retention";
import { updateRetentionPolicySchema } from "@/lib/schemas";

export async function GET() {
  try {
    const { organisationId, user } = await getDevContext();
    requirePermission(user.role, "audit:read");

    const policy = await getEffectiveRetentionPolicy(organisationId);
    return ok({ policy });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { organisationId, user, userId } = await getDevContext();
    requirePermission(user.role, "executions:manage");
    requireRole(user.role, ["owner", "admin"]);

    const parsed = updateRetentionPolicySchema.safeParse(await request.json());
    if (!parsed.success) {
      return badRequest("Invalid retention policy payload", parsed.error.flatten());
    }

    const policy = await prisma.retentionPolicy.upsert({
      where: { organisationId },
      update: {
        auditLogDays: parsed.data.audit_log_days,
        approvalDays: parsed.data.approval_days,
        executionDays: parsed.data.execution_days,
      },
      create: {
        organisationId,
        auditLogDays: parsed.data.audit_log_days,
        approvalDays: parsed.data.approval_days,
        executionDays: parsed.data.execution_days,
      },
    });

    await writeAuditLog({
      organisationId,
      eventType: "retention_policy_updated",
      actorType: "user",
      actorId: userId,
      details: {
        audit_log_days: policy.auditLogDays,
        approval_days: policy.approvalDays,
        execution_days: policy.executionDays,
      },
    });

    return ok({
      policy: {
        audit_log_days: policy.auditLogDays,
        approval_days: policy.approvalDays,
        execution_days: policy.executionDays,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}
