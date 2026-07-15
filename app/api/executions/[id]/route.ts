import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { notFound, ok, serverError } from "@/lib/http";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organisationId } = await getDevContext();
    const { id } = await params;

    const execution = await prisma.commandExecution.findFirst({
      where: { id, organisationId },
      include: { command: true, approvals: true },
    });

    if (!execution) return notFound("Execution not found");
    return ok({ execution });
  } catch (error) {
    return serverError(error);
  }
}

