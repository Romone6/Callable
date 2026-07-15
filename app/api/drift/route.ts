import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { forbidden, ok, serverError } from "@/lib/http";
import { requirePermission } from "@/lib/permissions";

export async function GET() {
  try {
    const { organisationId, user } = await getDevContext();
    requirePermission(user.role, "drift:read");
    const checks = await prisma.driftCheck.findMany({
      where: { organisationId },
      orderBy: { createdAt: "desc" },
      include: { command: true },
    });

    return ok({ checks });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}
