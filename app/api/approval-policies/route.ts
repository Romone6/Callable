import { Prisma } from "@prisma/client";
import { getDevContext } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { badRequest, forbidden, notFound, ok, serverError } from "@/lib/http";
import { requirePermission, requireRole } from "@/lib/permissions";
import { createApprovalPolicySchema, updateApprovalPolicySchema } from "@/lib/schemas";

function toResponse(policy: {
  id: string;
  name: string;
  status: string;
  isDefault: boolean;
  policyJson: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: policy.id,
    name: policy.name,
    status: policy.status,
    is_default: policy.isDefault,
    policy_json: policy.policyJson,
    created_at: policy.createdAt.toISOString(),
    updated_at: policy.updatedAt.toISOString(),
  };
}

export async function GET() {
  try {
    const { organisationId, user } = await getDevContext();
    requirePermission(user.role, "approvals:read");

    const policies = await prisma.approvalPolicy.findMany({
      where: { organisationId },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });

    return ok({
      approval_policies: policies.map(toResponse),
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { organisationId, user, userId } = await getDevContext();
    requirePermission(user.role, "approvals:review");
    requireRole(user.role, ["owner", "admin"]);

    const parsed = createApprovalPolicySchema.safeParse(await request.json());
    if (!parsed.success) {
      return badRequest("Invalid approval policy payload", parsed.error.flatten());
    }

    const created = await prisma.$transaction(async (tx) => {
      if (parsed.data.is_default) {
        await tx.approvalPolicy.updateMany({
          where: { organisationId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.approvalPolicy.create({
        data: {
          organisationId,
          name: parsed.data.name,
          status: parsed.data.status,
          isDefault: parsed.data.is_default,
          policyJson: parsed.data.policy_json as Prisma.InputJsonValue,
        },
      });
    });

    await writeAuditLog({
      organisationId,
      eventType: "approval_policy_created",
      actorType: "user",
      actorId: userId,
      details: {
        approval_policy_id: created.id,
        name: created.name,
        is_default: created.isDefault,
        status: created.status,
      },
    });

    return ok({ approval_policy: toResponse(created) }, 201);
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
    requirePermission(user.role, "approvals:review");
    requireRole(user.role, ["owner", "admin"]);

    const parsed = updateApprovalPolicySchema.safeParse(await request.json());
    if (!parsed.success) {
      return badRequest("Invalid approval policy update payload", parsed.error.flatten());
    }

    const existing = await prisma.approvalPolicy.findFirst({
      where: { organisationId, id: parsed.data.id },
    });
    if (!existing) {
      return notFound("Approval policy not found");
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (parsed.data.is_default) {
        await tx.approvalPolicy.updateMany({
          where: { organisationId, isDefault: true, id: { not: existing.id } },
          data: { isDefault: false },
        });
      }

      return tx.approvalPolicy.update({
        where: { id: existing.id },
        data: {
          name: parsed.data.name ?? existing.name,
          status: parsed.data.status ?? existing.status,
          isDefault: parsed.data.is_default ?? existing.isDefault,
          policyJson:
            parsed.data.policy_json !== undefined
              ? (parsed.data.policy_json as Prisma.InputJsonValue)
              : (existing.policyJson as Prisma.InputJsonValue),
        },
      });
    });

    await writeAuditLog({
      organisationId,
      eventType: "approval_policy_updated",
      actorType: "user",
      actorId: userId,
      details: {
        approval_policy_id: updated.id,
        name: updated.name,
        is_default: updated.isDefault,
        status: updated.status,
      },
    });

    return ok({ approval_policy: toResponse(updated) });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}
