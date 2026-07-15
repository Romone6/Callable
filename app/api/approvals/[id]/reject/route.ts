import { getDevContext } from "@/lib/auth";
import { badRequest, forbidden, ok } from "@/lib/http";
import { rejectApproval } from "@/lib/execution";
import { requirePermission } from "@/lib/permissions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, user } = await getDevContext();
    requirePermission(user.role, "approvals:review");
    const { id } = await params;
    const body = await request.json();
    const reason = typeof body.reason === "string" ? body.reason : "No reason provided";

    await rejectApproval({ approvalId: id, reviewerId: userId, reason });
    return ok({ status: "rejected" });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return badRequest("Unable to reject request", error instanceof Error ? error.message : String(error));
  }
}

