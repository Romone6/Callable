import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { ok, serverError } from "@/lib/http";

export async function GET() {
  try {
    const { organisationId } = await getDevContext();
    const candidates = await prisma.workflowCandidate.findMany({
      where: { organisationId },
      orderBy: { createdAt: "desc" },
    });
    return ok({ candidates });
  } catch (error) {
    return serverError(error);
  }
}

