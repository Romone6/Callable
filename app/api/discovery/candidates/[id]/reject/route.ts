import { CandidateStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { forbidden, notFound, ok, serverError } from "@/lib/http";
import { writeAuditLog } from "@/lib/audit";
import { requirePermission } from "@/lib/permissions";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organisationId, userId, user } = await getDevContext();
    requirePermission(user.role, "discovery:manage");
    const { id } = await params;

    const candidate = await prisma.workflowCandidate.findFirst({ where: { id, organisationId } });
    if (!candidate) return notFound("Candidate not found");

    const updated = await prisma.workflowCandidate.update({
      where: { id },
      data: { status: CandidateStatus.rejected },
    });

    await writeAuditLog({
      organisationId,
      eventType: "workflow_rejected",
      actorType: "user",
      actorId: userId,
      details: { candidate_id: id },
    });

    return ok({ candidate: updated });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}
