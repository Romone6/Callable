import { getDevContext } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { badRequest, forbidden, ok, serverError } from "@/lib/http";
import { requirePermission, requireRole } from "@/lib/permissions";
import { getEffectiveSecurityPolicy, updateSecurityPolicy } from "@/lib/security-policy";
import { updateSecurityPolicySchema } from "@/lib/schemas";

export async function GET() {
  try {
    const { organisationId, user } = await getDevContext();
    requirePermission(user.role, "identity:read");
    const policy = await getEffectiveSecurityPolicy(organisationId);
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
    requirePermission(user.role, "identity:manage");
    requireRole(user.role, ["owner", "admin"]);

    const body = await request.json();
    const parsed = updateSecurityPolicySchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid security policy payload", parsed.error.flatten());
    }

    const policy = await updateSecurityPolicy(organisationId, parsed.data);
    await writeAuditLog({
      organisationId,
      eventType: "security_policy_updated",
      actorType: "user",
      actorId: userId,
      details: {
        session_timeout_minutes: policy.session_timeout_minutes,
        api_key_ttl_days: policy.api_key_ttl_days,
        require_mfa: policy.require_mfa,
        ip_allowlist_count: policy.ip_allowlist.length,
      },
    });
    return ok({ policy });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}
