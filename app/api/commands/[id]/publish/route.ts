import { CommandStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { forbidden, notFound, ok, serverError } from "@/lib/http";
import { writeAuditLog } from "@/lib/audit";
import { transitionCommandStatus } from "@/lib/command-lifecycle";
import { requirePermission } from "@/lib/permissions";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organisationId, userId, user } = await getDevContext();
    requirePermission(user.role, "commands:publish");
    const { id } = await params;

    const command = await prisma.actionCommand.findFirst({ where: { id, organisationId } });
    if (!command) return notFound("Command not found");

    const target = command.status === CommandStatus.draft ? CommandStatus.needs_review : command.status;
    if (target !== command.status) {
      await transitionCommandStatus(id, target);
    }
    const updated = await transitionCommandStatus(id, CommandStatus.published);

    await writeAuditLog({
      organisationId,
      eventType: "command_published",
      actorType: "user",
      actorId: userId,
      commandId: id,
      details: { command_name: command.name },
    });

    return ok({ command: updated });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}

