import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { forbidden, ok, serverError } from "@/lib/http";
import { requirePermission } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    const { organisationId, user } = await getDevContext();
    requirePermission(user.role, "audit:read");
    const url = new URL(request.url);
    const eventType = url.searchParams.get("event_type");

    const logs = await prisma.auditLog.findMany({
      where: {
        organisationId,
        eventType: eventType ?? undefined,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return ok({ logs });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}
