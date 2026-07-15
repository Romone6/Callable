import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { forbidden, notFound, ok, serverError } from "@/lib/http";
import { runCommandThroughQueue } from "@/lib/execution-queue";
import { requirePermission } from "@/lib/permissions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organisationId, userId, user } = await getDevContext();
    requirePermission(user.role, "executions:manage");
    const { id } = await params;

    const execution = await prisma.commandExecution.findFirst({
      where: { id, organisationId },
      include: { command: true },
    });

    if (!execution) return notFound("Execution not found");

    const retried = await runCommandThroughQueue({
      organisationId,
      userId,
      commandName: execution.command.name,
      agentName: execution.agentName,
      input: execution.inputJson as Record<string, unknown>,
      idempotencyKey: request.headers.get("x-idempotency-key") ?? `retry-${execution.id}`,
    });

    return ok(retried);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}
