import { getDevContext } from "@/lib/auth";
import { forbidden, ok, serverError } from "@/lib/http";
import { requirePermission, requireRole } from "@/lib/permissions";
import { getWorkerStatusReport } from "@/lib/queue-observability";

export async function GET() {
  try {
    const { user } = await getDevContext();
    requirePermission(user.role, "executions:read");
    requirePermission(user.role, "drift:read");
    requireRole(user.role, ["owner", "admin", "operator"]);

    const report = await getWorkerStatusReport();
    return ok(report);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}
