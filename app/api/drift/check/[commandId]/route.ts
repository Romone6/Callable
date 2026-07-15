import { getDevContext } from "@/lib/auth";
import { badRequest, forbidden, ok } from "@/lib/http";
import { runDriftCheck } from "@/lib/drift";
import { requirePermission } from "@/lib/permissions";

export async function POST(_: Request, { params }: { params: Promise<{ commandId: string }> }) {
  try {
    const { organisationId, user } = await getDevContext();
    requirePermission(user.role, "drift:run");
    const { commandId } = await params;
    const check = await runDriftCheck(commandId, organisationId);
    return ok({ check });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return badRequest("Drift check failed", error instanceof Error ? error.message : String(error));
  }
}

