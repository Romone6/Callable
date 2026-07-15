import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { ok, serverError } from "@/lib/http";

export async function GET() {
  try {
    const { organisationId } = await getDevContext();
    const executions = await prisma.commandExecution.findMany({
      where: { organisationId },
      include: { command: true },
      orderBy: { createdAt: "desc" },
    });

    return ok({ executions });
  } catch (error) {
    return serverError(error);
  }
}

