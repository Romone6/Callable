import { getDevContext } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { badRequest, forbidden, ok, serverError } from "@/lib/http";
import { requirePermission, requireRole, ROLE_PERMISSIONS, sanitizePermissions } from "@/lib/permissions";
import { createCustomRoleSchema } from "@/lib/schemas";

const BUILTIN_ROLES = Object.keys(ROLE_PERMISSIONS);

export async function GET() {
  try {
    const { organisationId, user } = await getDevContext();
    requirePermission(user.role, "identity:read");

    const [customRoles, users] = await Promise.all([
      prisma.customRole.findMany({
        where: { organisationId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.user.findMany({
        where: { organisationId },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    return ok({
      builtin_roles: BUILTIN_ROLES.map((role) => ({
        role,
        permissions: ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS],
      })),
      custom_roles: customRoles.map((item) => ({
        id: item.id,
        role_key: item.roleKey,
        role: `custom:${item.roleKey}`,
        name: item.name,
        description: item.description,
        permissions: sanitizePermissions(item.permissionsJson),
        assigned_users: users.filter((u) => u.role === `custom:${item.roleKey}`).length,
        created_at: item.createdAt.toISOString(),
        updated_at: item.updatedAt.toISOString(),
      })),
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
      })),
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
    requirePermission(user.role, "identity:manage");
    requireRole(user.role, ["owner", "admin"]);

    const body = await request.json();
    const parsed = createCustomRoleSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid custom role payload", parsed.error.flatten());
    }

    const permissions = sanitizePermissions(parsed.data.permissions);
    if (permissions.length === 0) {
      return badRequest("Custom role requires at least one valid permission");
    }

    const created = await prisma.customRole.create({
      data: {
        organisationId,
        roleKey: parsed.data.role_key,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        permissionsJson: permissions,
      },
    });

    await writeAuditLog({
      organisationId,
      eventType: "custom_role_created",
      actorType: "user",
      actorId: userId,
      details: {
        role_key: created.roleKey,
        permissions_count: permissions.length,
      },
    });

    return ok(
      {
        role: {
          id: created.id,
          role_key: created.roleKey,
          role: `custom:${created.roleKey}`,
          name: created.name,
          description: created.description,
          permissions,
        },
      },
      201,
    );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return badRequest("Custom role key already exists for this organisation");
    }
    return serverError(error);
  }
}
