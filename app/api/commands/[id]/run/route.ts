import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { forbidden, notFound, ok, serverError } from "@/lib/http";
import { runCommandThroughQueue } from "@/lib/execution-queue";
import { parseCommandRunRequest } from "@/lib/command-run-contract";
import { requirePermission } from "@/lib/permissions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organisationId, userId, user } = await getDevContext();
    requirePermission(user.role, "commands:execute");
    const { id } = await params;

    const command = await prisma.actionCommand.findFirst({ where: { id, organisationId } });
    if (!command) return notFound("Command not found");

    const parsed = await parseCommandRunRequest(request);
    if (parsed.error) {
      return parsed.error;
    }

    const result = await runCommandThroughQueue({
      organisationId,
      userId,
      commandName: command.name,
      agentName: parsed.data.agent_name,
      input: parsed.data.input,
      dryRun: Boolean(parsed.data.dry_run),
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
