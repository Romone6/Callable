import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { ok, serverError } from "@/lib/http";

export async function GET() {
  try {
    const { organisationId } = await getDevContext();
    const sources = await prisma.discoverySource.findMany({
      where: { organisationId },
      orderBy: { createdAt: "desc" },
    });
    return ok({ sources });
  } catch (error) {
    return serverError(error);
  }
}

