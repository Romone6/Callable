import { getDevContext } from "@/lib/auth";
import { forbidden, ok, serverError } from "@/lib/http";
import { requirePermission, requireRole } from "@/lib/permissions";
import { getSloSummary } from "@/lib/ops-slo";

export async function GET(request: Request) {
  try {
    const { organisationId, user } = await getDevContext();
    requirePermission(user.role, "executions:read");
    requirePermission(user.role, "drift:read");
    requirePermission(user.role, "approvals:read");
    requireRole(user.role, ["owner", "admin", "operator", "reviewer"]);

    const url = new URL(request.url);
    const lookbackHours = Number(url.searchParams.get("lookback_hours") ?? 24);
    const summary = await getSloSummary(organisationId, lookbackHours);
    return ok(summary);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}
