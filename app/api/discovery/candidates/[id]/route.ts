import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { notFound, ok, serverError } from "@/lib/http";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organisationId } = await getDevContext();
    const { id } = await params;

    const candidate = await prisma.workflowCandidate.findFirst({ where: { id, organisationId } });
    if (!candidate) return notFound("Candidate not found");

    return ok({ candidate });
  } catch (error) {
    return serverError(error);
  }
}

