import { CommandStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ok, serverError, unauthorized } from "@/lib/http";
import { requireCronAuth } from "@/lib/cron-auth";
import { enqueueDriftChecks } from "@/lib/drift-queue";

export async function POST(request: Request) {
  try {
    await requireCronAuth(request);
    const body = await request.json().catch(() => ({}));
    const maxCommandsRaw = Number(body.max_commands ?? 100);
    const maxCommands = Number.isFinite(maxCommandsRaw) && maxCommandsRaw > 0 ? Math.min(maxCommandsRaw, 500) : 100;

    const commands = await prisma.actionCommand.findMany({
      where: { status: CommandStatus.published },
      select: { id: true, organisationId: true },
      orderBy: { createdAt: "desc" },
      take: maxCommands,
    });

    await enqueueDriftChecks(
      commands.map((command) => ({
        commandId: command.id,
        organisationId: command.organisationId,
      })),
    );

    return ok({
      enqueued: commands.length,
      max_commands: maxCommands,
      queue_mode: "fanout",
      jobs: commands.map((command) => ({ command_id: command.id, organisation_id: command.organisationId })),
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Unauthorized")) {
      return unauthorized(error.message);
    }
    return serverError(error);
  }
}
