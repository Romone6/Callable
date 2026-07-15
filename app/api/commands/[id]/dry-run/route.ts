import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { badRequest, forbidden, notFound, ok, serverError } from "@/lib/http";
import { runCommandThroughQueue } from "@/lib/execution-queue";
import { requirePermission } from "@/lib/permissions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organisationId, userId, user } = await getDevContext();
    requirePermission(user.role, "commands:execute");
    const { id } = await params;
    const body = await request.json();

    const command = await prisma.actionCommand.findFirst({ where: { id, organisationId } });
    if (!command) return notFound("Command not found");

    if (typeof body.agent_name !== "string" || typeof body.input !== "object") {
      return badRequest("agent_name and input are required");
    }

    const result = await runCommandThroughQueue({
      organisationId,
      userId,
      commandName: command.name,
      agentName: body.agent_name,
      input: body.input,
      dryRun: true,
      idempotencyKey: request.headers.get("x-idempotency-key") ?? undefined,
    });

    return ok(result);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}
