import { getDevContext } from "@/lib/auth";
import { forbidden, ok, serverError } from "@/lib/http";
import { writeAuditLog } from "@/lib/audit";
import { requireRole, requirePermission } from "@/lib/permissions";
import { listExportSigningKeys, rotateExportSigningKey } from "@/lib/export-signing-keys";

export async function GET() {
  try {
    const { organisationId, user } = await getDevContext();
    requirePermission(user.role, "audit:read");
    const keys = await listExportSigningKeys(organisationId);
    return ok({ keys });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}

export async function POST() {
  try {
    const { organisationId, user, userId } = await getDevContext();
    requirePermission(user.role, "executions:manage");
    requireRole(user.role, ["owner", "admin"]);

    const rotated = await rotateExportSigningKey(organisationId);

    await writeAuditLog({
      organisationId,
      eventType: "export_signing_key_rotated",
      actorType: "user",
      actorId: userId,
      details: {
        signing_key_id: rotated.id,
        key_id: rotated.keyId,
      },
    });

    return ok({ key: rotated }, 201);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}
