import { ActorType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

type AuditInput = {
  organisationId: string;
  eventType: string;
  actorType: ActorType;
  actorId?: string | null;
  commandId?: string | null;
  executionId?: string | null;
  details: Record<string, unknown>;
};

export async function writeAuditLog(input: AuditInput) {
  return prisma.auditLog.create({
    data: {
      organisationId: input.organisationId,
      eventType: input.eventType,
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      commandId: input.commandId ?? null,
      executionId: input.executionId ?? null,
      detailsJson: input.details as Prisma.InputJsonValue,
    },
  });
}

