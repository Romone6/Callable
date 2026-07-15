import { ExecutionStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { forbidden, notFound, ok, serverError } from "@/lib/http";
import { requirePermission } from "@/lib/permissions";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organisationId, user } = await getDevContext();
    requirePermission(user.role, "executions:manage");
    const { id } = await params;
    const execution = await prisma.commandExecution.findFirst({ where: { id, organisationId } });
    if (!execution) return notFound("Execution not found");

    const updated = await prisma.commandExecution.update({
      where: { id },
      data: { status: ExecutionStatus.cancelled, completedAt: new Date() },
    });

    return ok({ execution: updated });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}
