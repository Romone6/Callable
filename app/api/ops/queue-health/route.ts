import { getDevContext } from "@/lib/auth";
import { forbidden, ok, serverError } from "@/lib/http";
import { requirePermission, requireRole } from "@/lib/permissions";
import { getQueueHealthReport } from "@/lib/queue-observability";

export async function GET(request: Request) {
  try {
    const { user } = await getDevContext();
    requirePermission(user.role, "executions:read");
    requirePermission(user.role, "drift:read");
    requireRole(user.role, ["owner", "admin", "operator"]);

    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("failed_limit") ?? 10);
    const report = await getQueueHealthReport(limit);
    return ok(report);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}
