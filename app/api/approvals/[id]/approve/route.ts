import { getDevContext } from "@/lib/auth";
import { badRequest, forbidden, ok } from "@/lib/http";
import { finalizeApprovedExecution } from "@/lib/execution";
import { requirePermission } from "@/lib/permissions";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, user } = await getDevContext();
    requirePermission(user.role, "approvals:review");
    const { id } = await params;
    const output = await finalizeApprovedExecution({ approvalId: id, reviewerId: userId, reviewerRole: user.role });
    return ok({ status: "approved", output });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return badRequest("Unable to approve request", error instanceof Error ? error.message : String(error));
  }
}

