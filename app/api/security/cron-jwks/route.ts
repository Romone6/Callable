import { getDevContext } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { badRequest, forbidden, ok, serverError } from "@/lib/http";
import { requirePermission, requireRole } from "@/lib/permissions";
import {
  CronJwkValidationError,
  findPrivateJwkField,
  listCronJwksKeys,
  rotateCronJwksKey,
  rotateCronJwksSchema,
} from "@/lib/cron-jwks";

export async function GET() {
  try {
    const { user } = await getDevContext();
    requirePermission(user.role, "identity:read");

    const keys = await listCronJwksKeys();
    return ok({ keys });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user, userId, organisationId } = await getDevContext();
    requirePermission(user.role, "identity:manage");
    requireRole(user.role, ["owner", "admin"]);

    const body = await request.json();
    const parsed = rotateCronJwksSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid cron JWKS payload", parsed.error.flatten());
    }

    const privateField = findPrivateJwkField(parsed.data.jwk as Record<string, unknown>);
    if (privateField) {
      return badRequest(`Invalid JWK: private key field '${privateField}' is not allowed.`);
    }

    const rotated = await rotateCronJwksKey(parsed.data);

    await writeAuditLog({
      organisationId,
      eventType: "cron_jwks_rotated",
      actorType: "user",
      actorId: userId,
      details: {
        key_id: rotated.key_id,
        status: rotated.status,
      },
    });

    return ok({ key: rotated }, 201);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    if (error instanceof CronJwkValidationError || (error instanceof Error && error.name === "CronJwkValidationError")) {
      return badRequest(error.message);
    }
    if (error instanceof Error && (error.message.includes("grace_window_minutes") || error.message.startsWith("Invalid"))) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}
