import { CommandStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { canTransitionStatus } from "@/lib/command-status";

export async function transitionCommandStatus(commandId: string, to: CommandStatus) {
  const existing = await prisma.actionCommand.findUnique({ where: { id: commandId } });
  if (!existing) throw new Error("Command not found");

  if (!canTransitionStatus(existing.status, to)) {
    throw new Error(`Invalid status transition from ${existing.status} to ${to}`);
  }

  return prisma.actionCommand.update({
    where: { id: commandId },
    data: { status: to },
  });
}

