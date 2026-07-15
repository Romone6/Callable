import { getDevContext } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { badRequest, forbidden, notFound, ok, serverError } from "@/lib/http";
import { requirePermission, requireRole, ROLE_PERMISSIONS } from "@/lib/permissions";
import { assignUserRoleSchema } from "@/lib/schemas";

const BUILTIN_ROLES = new Set(Object.keys(ROLE_PERMISSIONS));

export async function POST(request: Request) {
  try {
    const { organisationId, user, userId } = await getDevContext();
    requirePermission(user.role, "identity:manage");
    requireRole(user.role, ["owner", "admin"]);

    const body = await request.json();
    const parsed = assignUserRoleSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid role assignment payload", parsed.error.flatten());
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        id: parsed.data.user_id,
        organisationId,
      },
    });
    if (!targetUser) {
      return notFound("Target user not found");
    }

    const nextRole = parsed.data.role.trim();
    if (BUILTIN_ROLES.has(nextRole)) {
      const updated = await prisma.user.update({
        where: { id: targetUser.id },
        data: { role: nextRole },
      });

      await writeAuditLog({
        organisationId,
        eventType: "user_role_assigned",
        actorType: "user",
        actorId: userId,
        details: {
          target_user_id: updated.id,
          role: updated.role,
        },
      });

      return ok({
        user: {
          id: updated.id,
          role: updated.role,
        },
      });
    }

    if (!nextRole.startsWith("custom:")) {
      return badRequest("Role must be a built-in role or `custom:<role_key>`");
    }

    const roleKey = nextRole.slice("custom:".length);
    const customRole = await prisma.customRole.findFirst({
      where: {
        organisationId,
        roleKey,
      },
    });
    if (!customRole) {
      return notFound(`Custom role '${roleKey}' not found`);
    }

    const updated = await prisma.user.update({
      where: { id: targetUser.id },
      data: { role: nextRole },
    });

    await writeAuditLog({
      organisationId,
      eventType: "user_role_assigned",
      actorType: "user",
      actorId: userId,
      details: {
        target_user_id: updated.id,
        role: updated.role,
      },
    });

    return ok({
      user: {
        id: updated.id,
        role: updated.role,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}
