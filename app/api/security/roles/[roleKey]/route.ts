import { getDevContext } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { badRequest, forbidden, notFound, ok, serverError } from "@/lib/http";
import { requirePermission, requireRole, sanitizePermissions } from "@/lib/permissions";
import { updateCustomRoleSchema } from "@/lib/schemas";

export async function PATCH(request: Request, { params }: { params: Promise<{ roleKey: string }> }) {
  try {
    const { organisationId, user, userId } = await getDevContext();
    requirePermission(user.role, "identity:manage");
    requireRole(user.role, ["owner", "admin"]);

    const { roleKey } = await params;
    const body = await request.json();
    const parsed = updateCustomRoleSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid custom role update payload", parsed.error.flatten());
    }

    const existing = await prisma.customRole.findFirst({
      where: {
        organisationId,
        roleKey,
      },
    });
    if (!existing) {
      return notFound(`Custom role '${roleKey}' not found`);
    }

    const permissions = parsed.data.permissions ? sanitizePermissions(parsed.data.permissions) : undefined;
    if (parsed.data.permissions && permissions && permissions.length === 0) {
      return badRequest("Custom role requires at least one valid permission");
    }

    const updated = await prisma.customRole.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.name ?? existing.name,
        description:
          parsed.data.description === undefined
            ? existing.description
            : parsed.data.description === null
              ? null
              : parsed.data.description,
        permissionsJson: permissions
          ? (permissions as Prisma.InputJsonValue)
          : (existing.permissionsJson as Prisma.InputJsonValue),
      },
    });

    await writeAuditLog({
      organisationId,
      eventType: "custom_role_updated",
      actorType: "user",
      actorId: userId,
      details: {
        role_key: updated.roleKey,
      },
    });

    return ok({
      role: {
        id: updated.id,
        role_key: updated.roleKey,
        role: `custom:${updated.roleKey}`,
        name: updated.name,
        description: updated.description,
        permissions: sanitizePermissions(updated.permissionsJson),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ roleKey: string }> }) {
  try {
    const { organisationId, user, userId } = await getDevContext();
    requirePermission(user.role, "identity:manage");
    requireRole(user.role, ["owner", "admin"]);

    const { roleKey } = await params;
    const existing = await prisma.customRole.findFirst({
      where: {
        organisationId,
        roleKey,
      },
    });
    if (!existing) {
      return notFound(`Custom role '${roleKey}' not found`);
    }

    await prisma.$transaction([
      prisma.user.updateMany({
        where: {
          organisationId,
          role: `custom:${roleKey}`,
        },
        data: {
          role: "viewer",
        },
      }),
      prisma.customRole.delete({
        where: { id: existing.id },
      }),
    ]);

    await writeAuditLog({
      organisationId,
      eventType: "custom_role_deleted",
      actorType: "user",
      actorId: userId,
      details: {
        role_key: roleKey,
      },
    });

    return ok({ deleted: true, role_key: roleKey });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}
